-- Dzair Store V2.2 — production hardening
-- Run after ORDERS_MIGRATION.sql + ORDER_ITEMS_MIGRATION.sql + SUBSCRIPTION_PLAN_SELECTION_MIGRATION.sql.

-- 1) Orders: merchants may change status only; they cannot rewrite money/customer/store fields.
DROP POLICY IF EXISTS orders_update_owner ON public.orders;
DROP POLICY IF EXISTS orders_update_status_owner ON public.orders;
DROP POLICY IF EXISTS orders_delete_owner ON public.orders;
-- No direct UPDATE/DELETE policy is intentionally granted. The two SECURITY DEFINER RPCs below
-- expose only the exact mutations the dashboard needs.

-- 2) Atomic status mutation. This is what the UI should call instead of a broad UPDATE.
CREATE OR REPLACE FUNCTION public.update_order_status(p_order_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id uuid;
  v_current text;
BEGIN
  IF p_status NOT IN ('new','confirmed','shipped','done','cancelled') THEN
    RAISE EXCEPTION 'invalid order status';
  END IF;

  SELECT store_id, status INTO v_store_id, v_current
  FROM public.orders WHERE id = p_order_id FOR UPDATE;

  IF v_store_id IS NULL OR NOT public.is_store_owner(v_store_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.orders SET status = p_status WHERE id = p_order_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.update_order_status(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_store_id uuid;
BEGIN
  SELECT store_id INTO v_store_id FROM public.orders WHERE id = p_order_id;
  IF v_store_id IS NULL OR NOT public.is_store_owner(v_store_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  DELETE FROM public.orders WHERE id = p_order_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.delete_order(uuid) TO authenticated;

-- 3) Free-plan limits must be enforced in the database, not only in React.
CREATE OR REPLACE FUNCTION public.enforce_product_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_plan text; v_count integer;
BEGIN
  SELECT plan INTO v_plan FROM public.stores WHERE id = NEW.store_id FOR UPDATE;
  IF COALESCE(v_plan, 'free') = 'free' THEN
    SELECT count(*) INTO v_count FROM public.products
    WHERE store_id = NEW.store_id AND is_active = true AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    IF TG_OP = 'INSERT' THEN
      IF v_count >= 5 THEN RAISE EXCEPTION 'free_plan_product_limit'; END IF;
    ELSIF NEW.store_id <> OLD.store_id OR NOT COALESCE(OLD.is_active, false) THEN
      IF v_count >= 5 THEN RAISE EXCEPTION 'free_plan_product_limit'; END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_enforce_product_limit ON public.products;
CREATE TRIGGER trg_enforce_product_limit
BEFORE INSERT OR UPDATE OF store_id,is_active ON public.products
FOR EACH ROW EXECUTE FUNCTION public.enforce_product_limit();

-- 4) Free plan: maximum 30 new orders per calendar month.
CREATE OR REPLACE FUNCTION public.enforce_order_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_plan text; v_count integer;
BEGIN
  SELECT plan INTO v_plan FROM public.stores WHERE id = NEW.store_id FOR UPDATE;
  IF COALESCE(v_plan, 'free') = 'free' THEN
    SELECT count(*) INTO v_count FROM public.orders
    WHERE store_id = NEW.store_id
      AND created_at >= date_trunc('month', now());
    IF v_count >= 30 THEN
      RAISE EXCEPTION 'free_plan_order_limit';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_enforce_order_limit ON public.orders;
CREATE TRIGGER trg_enforce_order_limit
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.enforce_order_limit();

-- 5) Validate basic order input at database level.
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_quantity_positive,
  DROP CONSTRAINT IF EXISTS orders_total_nonnegative;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_quantity_positive CHECK (quantity > 0),
  ADD CONSTRAINT orders_total_nonnegative CHECK (shipping_price >= 0 AND total_price >= 0);

-- 6) Payment requests: never allow a client to submit a request for another owner/store.
DO $$ BEGIN
  IF to_regclass('public.subscription_requests') IS NOT NULL THEN
    DROP POLICY IF EXISTS subscription_requests_insert_own ON public.subscription_requests;
    CREATE POLICY subscription_requests_insert_own ON public.subscription_requests
      FOR INSERT TO authenticated
      WITH CHECK (
        owner_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid())
      );
  END IF;
END $$;

-- 7) Orders are created atomically with authoritative product prices.
-- The browser-provided unit_price/product_name is treated as display-only.
CREATE OR REPLACE FUNCTION public.create_cart_order(
  p_store_id uuid,
  p_customer_name text,
  p_phone text,
  p_wilaya_code integer,
  p_wilaya_name text,
  p_commune text,
  p_address text,
  p_delivery_type text,
  p_shipping_price numeric,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_store_open boolean;
  v_published boolean;
  v_delivery_mode text;
  v_local_delivery_price numeric;
  v_local_free_over numeric;
  v_shipping numeric := 0;
  v_item jsonb;
  v_product_id uuid;
  v_qty integer;
  v_product_name text;
  v_price numeric;
  v_track_stock boolean;
  v_stock integer;
  v_subtotal numeric := 0;
  v_total_qty integer := 0;
  v_summary text := '';
  v_confirmed_items jsonb := '[]'::jsonb;
BEGIN
  IF p_customer_name IS NULL OR length(trim(p_customer_name)) < 2 THEN RAISE EXCEPTION 'invalid_customer_name'; END IF;
  IF p_phone IS NULL OR length(regexp_replace(p_phone, '\s', '', 'g')) < 9 THEN RAISE EXCEPTION 'invalid_phone'; END IF;
  IF p_delivery_type NOT IN ('home','desk') THEN RAISE EXCEPTION 'invalid_delivery_type'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'empty_cart'; END IF;

  SELECT is_published, COALESCE(is_open, true), COALESCE(delivery_mode,'national'),
         COALESCE(local_delivery_price,0), local_delivery_free_over
    INTO v_published, v_store_open, v_delivery_mode, v_local_delivery_price, v_local_free_over
  FROM public.stores WHERE id = p_store_id;
  IF NOT COALESCE(v_published, false) THEN RAISE EXCEPTION 'store_not_published'; END IF;
  IF NOT COALESCE(v_store_open, true) THEN RAISE EXCEPTION 'store_closed'; END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := NULLIF(v_item->>'product_id','')::uuid;
    v_qty := COALESCE((v_item->>'quantity')::integer, 0);
    IF v_product_id IS NULL OR v_qty < 1 OR v_qty > 99 THEN RAISE EXCEPTION 'invalid_cart_item'; END IF;

    SELECT name, price, track_stock, stock
      INTO v_product_name, v_price, v_track_stock, v_stock
    FROM public.products
    WHERE id = v_product_id AND store_id = p_store_id AND is_active = true
    FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'product_unavailable'; END IF;
    IF COALESCE(v_price,0) < 0 THEN RAISE EXCEPTION 'invalid_product_price'; END IF;
    IF COALESCE(v_track_stock,false) AND COALESCE(v_stock,0) < v_qty THEN RAISE EXCEPTION 'out_of_stock'; END IF;

    v_subtotal := v_subtotal + (v_price * v_qty);
    v_total_qty := v_total_qty + v_qty;
    v_summary := concat_ws(' · ', NULLIF(v_summary,''), v_product_name || ' × ' || v_qty);
    v_confirmed_items := v_confirmed_items || jsonb_build_array(jsonb_build_object('name', v_product_name, 'quantity', v_qty, 'unit_price', v_price));
  END LOOP;

  -- Shipping is calculated server-side so a modified browser cannot underpay COD.
  IF v_delivery_mode = 'local_flat' THEN
    v_shipping := CASE
      WHEN v_local_free_over IS NOT NULL AND v_subtotal >= v_local_free_over THEN 0
      ELSE GREATEST(0, COALESCE(v_local_delivery_price,0))
    END;
  ELSE
    IF p_wilaya_code IS NULL THEN RAISE EXCEPTION 'wilaya_required'; END IF;
    IF p_wilaya_code IN (1,7,8,11,30,32,33,37,39,45,47,49,50,51,52,53,54,55,56,57,58) THEN
      v_shipping := CASE WHEN p_delivery_type = 'home' THEN 1000 ELSE 800 END;
    ELSIF p_wilaya_code IN (3,4,5,12,14,17,19,20,28,34,38,40,41) THEN
      v_shipping := CASE WHEN p_delivery_type = 'home' THEN 700 ELSE 500 END;
    ELSE
      v_shipping := CASE WHEN p_delivery_type = 'home' THEN 500 ELSE 350 END;
    END IF;
  END IF;

  INSERT INTO public.orders (
    store_id, customer_name, phone, wilaya_code, wilaya_name, commune, address,
    delivery_type, product_name, quantity, shipping_price, total_price, status
  ) VALUES (
    p_store_id, trim(p_customer_name), trim(p_phone), p_wilaya_code, p_wilaya_name,
    NULLIF(trim(COALESCE(p_commune,'')),''), NULLIF(trim(COALESCE(p_address,'')),''),
    p_delivery_type, left(v_summary, 1000), v_total_qty, v_shipping,
    v_subtotal + v_shipping, 'new'
  ) RETURNING id INTO v_order_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::integer;
    SELECT name, price, track_stock INTO v_product_name, v_price, v_track_stock
      FROM public.products WHERE id = v_product_id FOR UPDATE;

    INSERT INTO public.order_items(order_id, product_id, product_name, quantity, unit_price)
    VALUES (v_order_id, v_product_id, v_product_name, v_qty, v_price);

    IF COALESCE(v_track_stock,false) THEN
      UPDATE public.products SET stock = GREATEST(0, COALESCE(stock,0) - v_qty)
      WHERE id = v_product_id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'id', v_order_id,
    'subtotal', v_subtotal,
    'shipping_price', v_shipping,
    'total_price', v_subtotal + v_shipping,
    'items', v_confirmed_items
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_cart_order(uuid,text,text,integer,text,text,text,text,numeric,jsonb) TO anon, authenticated;

-- 8) Carrier secrets must not be readable through normal table SELECTs.
-- The merchant can still UPDATE the value through the dashboard, but it is never
-- returned to the browser. The shipping API retrieves it through an owner-checked RPC.
REVOKE SELECT (yalidine_api_token) ON public.stores FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_shipping_credentials(p_order_id uuid)
RETURNS TABLE (
  store_id uuid,
  yalidine_api_id text,
  yalidine_api_token text,
  shipping_enabled boolean,
  preferred_carrier text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.yalidine_api_id, s.yalidine_api_token, COALESCE(s.shipping_enabled,false), s.preferred_carrier
  FROM public.orders o
  JOIN public.stores s ON s.id = o.store_id
  WHERE o.id = p_order_id AND s.owner_id = auth.uid();
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_shipping_credentials(uuid) TO authenticated;
