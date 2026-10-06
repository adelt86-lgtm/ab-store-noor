-- Dzair Store V3 · Real product variants + variant-aware orders/inventory
-- Run after SCHEMA_GAPS_V2_2.sql + ORDER_ITEMS_MIGRATION.sql + HARDENING_V2_2.sql.

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS price numeric(12,2);

UPDATE public.product_variants pv
SET price = COALESCE(pv.price, p.price, 0)
FROM public.products p
WHERE p.id = pv.product_id;

ALTER TABLE public.product_variants
  ALTER COLUMN price SET DEFAULT 0,
  ALTER COLUMN price SET NOT NULL;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS variant_id uuid,
  ADD COLUMN IF NOT EXISTS variant_color text,
  ADD COLUMN IF NOT EXISTS variant_taille text,
  ADD COLUMN IF NOT EXISTS variant_pointure text;

CREATE INDEX IF NOT EXISTS idx_order_items_variant ON public.order_items(variant_id);

-- Variant-aware atomic order creation. Browser prices remain display-only;
-- the database resolves the authoritative variant/product price and stock.
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
  v_variant_id uuid;
  v_qty integer;
  v_product_name text;
  v_price numeric;
  v_track_stock boolean;
  v_stock integer;
  v_color text;
  v_taille text;
  v_pointure text;
  v_subtotal numeric := 0;
  v_total_qty integer := 0;
  v_summary text := '';
  v_confirmed_items jsonb := '[]'::jsonb;
BEGIN
  IF p_customer_name IS NULL OR length(trim(p_customer_name)) < 2 THEN RAISE EXCEPTION 'invalid_customer_name'; END IF;
  IF p_phone IS NULL OR length(regexp_replace(p_phone, '\\s', '', 'g')) < 9 THEN RAISE EXCEPTION 'invalid_phone'; END IF;
  IF p_delivery_type NOT IN ('home','desk') THEN RAISE EXCEPTION 'invalid_delivery_type'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'empty_cart'; END IF;

  SELECT is_published, COALESCE(is_open, true), COALESCE(delivery_mode,'national'),
         COALESCE(local_delivery_price,0), local_delivery_free_over
    INTO v_published, v_store_open, v_delivery_mode, v_local_delivery_price, v_local_free_over
  FROM public.stores WHERE id = p_store_id FOR UPDATE;
  IF NOT COALESCE(v_published, false) THEN RAISE EXCEPTION 'store_not_published'; END IF;
  IF NOT COALESCE(v_store_open, true) THEN RAISE EXCEPTION 'store_closed'; END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := NULLIF(v_item->>'product_id','')::uuid;
    v_variant_id := NULLIF(v_item->>'variant_id','')::uuid;
    v_qty := COALESCE((v_item->>'quantity')::integer, 0);
    IF v_product_id IS NULL OR v_qty < 1 OR v_qty > 99 THEN RAISE EXCEPTION 'invalid_cart_item'; END IF;

    v_color := NULL;
    v_taille := NULL;
    v_pointure := NULL;

    IF v_variant_id IS NOT NULL THEN
      SELECT p.name, pv.price, pv.stock, pv.color, pv.taille, pv.pointure
        INTO v_product_name, v_price, v_stock, v_color, v_taille, v_pointure
      FROM public.product_variants pv
      JOIN public.products p ON p.id = pv.product_id
      WHERE pv.id = v_variant_id
        AND pv.product_id = v_product_id
        AND p.store_id = p_store_id
        AND p.is_active = true
        AND pv.is_active = true
      FOR UPDATE OF pv;

      IF NOT FOUND THEN RAISE EXCEPTION 'variant_unavailable'; END IF;
      IF COALESCE(v_price,0) < 0 THEN RAISE EXCEPTION 'invalid_product_price'; END IF;
      IF COALESCE(v_stock,0) < v_qty THEN RAISE EXCEPTION 'out_of_stock'; END IF;
    ELSE
      SELECT name, price, track_stock, stock
        INTO v_product_name, v_price, v_track_stock, v_stock
      FROM public.products
      WHERE id = v_product_id AND store_id = p_store_id AND is_active = true
      FOR UPDATE;

      IF NOT FOUND THEN RAISE EXCEPTION 'product_unavailable'; END IF;
      IF COALESCE(v_price,0) < 0 THEN RAISE EXCEPTION 'invalid_product_price'; END IF;
      IF COALESCE(v_track_stock,false) AND COALESCE(v_stock,0) < v_qty THEN RAISE EXCEPTION 'out_of_stock'; END IF;
    END IF;

    v_subtotal := v_subtotal + (v_price * v_qty);
    v_total_qty := v_total_qty + v_qty;
    v_summary := concat_ws(' · ', NULLIF(v_summary,''),
      v_product_name ||
      CASE WHEN v_variant_id IS NOT NULL THEN
        concat(' (', concat_ws(' / ', NULLIF(v_color,''), NULLIF(v_taille,''), NULLIF(v_pointure,'')), ')')
      ELSE '' END || ' × ' || v_qty);

    v_confirmed_items := v_confirmed_items || jsonb_build_array(jsonb_build_object(
      'name', v_product_name,
      'quantity', v_qty,
      'unit_price', v_price,
      'variant_id', v_variant_id,
      'variant_color', v_color,
      'variant_taille', v_taille,
      'variant_pointure', v_pointure
    ));
  END LOOP;

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
    v_variant_id := NULLIF(v_item->>'variant_id','')::uuid;
    v_qty := (v_item->>'quantity')::integer;

    IF v_variant_id IS NOT NULL THEN
      SELECT p.name, pv.price, pv.color, pv.taille, pv.pointure
        INTO v_product_name, v_price, v_color, v_taille, v_pointure
      FROM public.product_variants pv
      JOIN public.products p ON p.id = pv.product_id
      WHERE pv.id = v_variant_id AND pv.product_id = v_product_id
      FOR UPDATE OF pv;

      INSERT INTO public.order_items(
        order_id, product_id, product_name, quantity, unit_price,
        variant_id, variant_color, variant_taille, variant_pointure
      ) VALUES (
        v_order_id, v_product_id::text, v_product_name, v_qty, v_price,
        v_variant_id, v_color, v_taille, v_pointure
      );

      UPDATE public.product_variants
      SET stock = GREATEST(0, COALESCE(stock,0) - v_qty)
      WHERE id = v_variant_id;
    ELSE
      SELECT name, price, track_stock INTO v_product_name, v_price, v_track_stock
        FROM public.products WHERE id = v_product_id FOR UPDATE;

      INSERT INTO public.order_items(order_id, product_id, product_name, quantity, unit_price)
      VALUES (v_order_id, v_product_id::text, v_product_name, v_qty, v_price);

      IF COALESCE(v_track_stock,false) THEN
        UPDATE public.products SET stock = GREATEST(0, COALESCE(stock,0) - v_qty)
        WHERE id = v_product_id;
      END IF;
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

REVOKE EXECUTE ON FUNCTION public.create_cart_order(uuid,text,text,integer,text,text,text,text,numeric,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_cart_order(uuid,text,text,integer,text,text,text,text,numeric,jsonb) TO service_role;

-- Restock the exact product/variant when a merchant cancels an order.
CREATE OR REPLACE FUNCTION public.update_order_status(p_order_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id uuid;
  v_current text;
  v_item record;
BEGIN
  IF p_status NOT IN ('new','confirmed','shipped','done','cancelled') THEN
    RAISE EXCEPTION 'invalid order status';
  END IF;

  SELECT store_id, status INTO v_store_id, v_current
  FROM public.orders WHERE id = p_order_id FOR UPDATE;

  IF v_store_id IS NULL OR NOT public.is_store_owner(v_store_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_status = 'cancelled' AND COALESCE(v_current,'') <> 'cancelled' THEN
    FOR v_item IN SELECT * FROM public.order_items WHERE order_id = p_order_id LOOP
      IF v_item.variant_id IS NOT NULL THEN
        UPDATE public.product_variants
        SET stock = COALESCE(stock,0) + COALESCE(v_item.quantity,0)
        WHERE id = v_item.variant_id;
      ELSE
        UPDATE public.products p
        SET stock = COALESCE(p.stock,0) + COALESCE(v_item.quantity,0)
        WHERE p.id::text = v_item.product_id
          AND COALESCE(p.track_stock,false) = true;
      END IF;
    END LOOP;
  END IF;

  UPDATE public.orders SET status = p_status WHERE id = p_order_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.update_order_status(uuid,text) TO authenticated;
