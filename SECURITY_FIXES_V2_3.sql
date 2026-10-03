-- =====================================================================
-- Dzair Store — SECURITY FIXES V2.3
-- Run LAST, after every other *.sql in this repo (FIX_*_RLS.sql re-open tables; this file closes them again).
-- Safe to re-run. Review section 2 before applying on production.
-- =====================================================================
BEGIN;

-- ---------------------------------------------------------------------
-- 1) Shipping tables are SERVER-ONLY again.
--    FIX_SHIPPING_RLS.sql / FIX_SHIPPING_SHIPMENTS_RLS.sql re-opened them
--    to the browser, letting a merchant read/overwrite credentials_encrypted,
--    force status='connected', and forge tracking events.
--    All access now goes through /api/* using the service role.
-- ---------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname='public'
      AND tablename IN ('shipping_connections','shipping_shipments','shipping_tracking_events')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

REVOKE ALL ON public.shipping_connections     FROM anon, authenticated;
REVOKE ALL ON public.shipping_shipments       FROM anon, authenticated;
REVOKE ALL ON public.shipping_tracking_events FROM anon, authenticated;

-- ---------------------------------------------------------------------
-- 2) stores.yalidine_api_token must not be readable from the browser.
--    A column-level REVOKE is a no-op while the table-level SELECT grant
--    exists, so: drop the table-level grant, then grant every column
--    EXCEPT the token. (UPDATE on the token column is kept so the
--    dashboard can still save it.)
--    NOTE: any column you add to stores later needs
--          GRANT SELECT (new_col) ON public.stores TO anon, authenticated;
--    Long-term: store the Yalidine credentials in shipping_connections
--    (encrypted) and DROP COLUMN yalidine_api_token.
-- ---------------------------------------------------------------------
REVOKE SELECT ON public.stores FROM anon, authenticated;
DO $$
DECLARE cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
    INTO cols
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='stores'
    AND column_name NOT IN ('yalidine_api_token');
  EXECUTE format('GRANT SELECT (%s) ON public.stores TO anon, authenticated', cols);
END $$;

-- ---------------------------------------------------------------------
-- 3) Merchants must not be able to edit their own plan / ownership.
--    Super admin (is_super_admin) and the service role (auth.uid() IS NULL)
--    are allowed. Test the subscription-approval flow after applying.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_store_privileged_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_super_admin() THEN
    IF NEW.owner_id        IS DISTINCT FROM OLD.owner_id
    OR NEW.plan            IS DISTINCT FROM OLD.plan
    OR NEW.plan_expires_at IS DISTINCT FROM OLD.plan_expires_at THEN
      RAISE EXCEPTION 'protected_column';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_protect_store_privileged ON public.stores;
CREATE TRIGGER trg_protect_store_privileged
BEFORE UPDATE ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.protect_store_privileged_columns();

-- ---------------------------------------------------------------------
-- 4) Public order endpoint abuse limits
--    (create_cart_order is callable by anon).
-- ---------------------------------------------------------------------
-- 4a) Cancelled orders no longer burn the free-plan monthly quota.
CREATE OR REPLACE FUNCTION public.enforce_order_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_plan text; v_count integer;
BEGIN
  SELECT plan INTO v_plan FROM public.stores WHERE id = NEW.store_id FOR UPDATE;
  IF COALESCE(v_plan,'free') = 'free' THEN
    SELECT count(*) INTO v_count FROM public.orders
    WHERE store_id = NEW.store_id
      AND status <> 'cancelled'
      AND created_at >= date_trunc('month', now());
    IF v_count >= 30 THEN RAISE EXCEPTION 'free_plan_order_limit'; END IF;
  END IF;
  RETURN NEW;
END $$;

-- 4b) Rate limit: max 5 orders / hour per phone per store,
--     and a burst ceiling of 100 orders / hour per store.
CREATE OR REPLACE FUNCTION public.enforce_order_rate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_phone_cnt integer; v_store_cnt integer;
BEGIN
  SELECT count(*) FILTER (WHERE phone = NEW.phone), count(*)
    INTO v_phone_cnt, v_store_cnt
  FROM public.orders
  WHERE store_id = NEW.store_id AND created_at >= now() - interval '1 hour';
  IF v_phone_cnt >= 5   THEN RAISE EXCEPTION 'too_many_orders_for_phone'; END IF;
  IF v_store_cnt >= 100 THEN RAISE EXCEPTION 'store_order_burst_limit';   END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_enforce_order_rate ON public.orders;
CREATE TRIGGER trg_enforce_order_rate
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.enforce_order_rate();

CREATE INDEX IF NOT EXISTS idx_orders_store_created ON public.orders(store_id, created_at DESC);

-- 4c) Input size/shape limits (NOT VALID = applies to new rows only).
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_customer_name_len,
  DROP CONSTRAINT IF EXISTS orders_phone_shape,
  DROP CONSTRAINT IF EXISTS orders_address_len,
  DROP CONSTRAINT IF EXISTS orders_commune_len,
  DROP CONSTRAINT IF EXISTS orders_wilaya_name_len;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_customer_name_len CHECK (char_length(customer_name) <= 120)           NOT VALID,
  ADD CONSTRAINT orders_phone_shape       CHECK (phone ~ '^\+?[0-9 ]{9,15}$')                  NOT VALID,
  ADD CONSTRAINT orders_address_len       CHECK (address     IS NULL OR char_length(address)     <= 300) NOT VALID,
  ADD CONSTRAINT orders_commune_len       CHECK (commune     IS NULL OR char_length(commune)     <= 120) NOT VALID,
  ADD CONSTRAINT orders_wilaya_name_len   CHECK (wilaya_name IS NULL OR char_length(wilaya_name) <= 80)  NOT VALID;

-- ---------------------------------------------------------------------
-- 5) Payment secrets: wipe the cardless/GAB withdrawal code as soon as the
--    request is decided (approved or rejected). It is only needed while
--    the admin verifies the payment.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.wipe_cardless_code_on_review()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status <> 'pending' THEN
    NEW.cardless_code := NULL;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_wipe_cardless_code ON public.subscription_requests;
CREATE TRIGGER trg_wipe_cardless_code
BEFORE UPDATE ON public.subscription_requests
FOR EACH ROW EXECUTE FUNCTION public.wipe_cardless_code_on_review();

-- One-off cleanup of codes already attached to decided requests.
UPDATE public.subscription_requests SET cardless_code = NULL
WHERE status <> 'pending' AND cardless_code IS NOT NULL;

-- ---------------------------------------------------------------------
-- 6) SECURITY DEFINER hygiene: pin search_path (incl. pg_temp) and remove
--    default PUBLIC/anon execute from owner-only RPCs.
-- ---------------------------------------------------------------------
DO $$
DECLARE sig text;
BEGIN
  FOREACH sig IN ARRAY ARRAY[
    'public.mark_order_shipped(uuid,text,text,text)',
    'public.update_order_status(uuid,text)',
    'public.delete_order(uuid)',
    'public.get_shipping_credentials(uuid)',
    'public.enforce_product_limit()',
    'public.increment_store_visit(text)',
    'public.create_cart_order(uuid,text,text,integer,text,text,text,text,numeric,jsonb)'
  ] LOOP
    IF to_regprocedure(sig) IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', sig);
    END IF;
  END LOOP;

  FOREACH sig IN ARRAY ARRAY[
    'public.mark_order_shipped(uuid,text,text,text)',
    'public.update_order_status(uuid,text)',
    'public.delete_order(uuid)',
    'public.get_shipping_credentials(uuid)'
  ] LOOP
    IF to_regprocedure(sig) IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', sig);
      EXECUTE format('GRANT  EXECUTE ON FUNCTION %s TO authenticated', sig);
    END IF;
  END LOOP;
END $$;

COMMIT;

-- =====================================================================
-- VERIFY (run as separate queries after applying)
-- =====================================================================
-- (a) Token must NOT be selectable by anon — expect: permission denied
--     SET ROLE anon; SELECT yalidine_api_token FROM public.stores LIMIT 1; RESET ROLE;
-- (b) Public columns still readable — expect rows
--     SET ROLE anon; SELECT id, slug, name FROM public.stores LIMIT 1; RESET ROLE;
-- (c) Shipping tables closed — expect: permission denied
--     SET ROLE authenticated; SELECT * FROM public.shipping_connections LIMIT 1; RESET ROLE;
-- (d) Triggers present
--     SELECT tgname FROM pg_trigger WHERE tgname IN
--       ('trg_enforce_order_rate','trg_protect_store_privileged','trg_wipe_cardless_code');
