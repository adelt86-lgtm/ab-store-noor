-- Dzair Store V2.2 — missing schema pieces referenced by the application.
-- Safe to run after the base stores/products schema exists.

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS is_open boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS working_hours text,
  ADD COLUMN IF NOT EXISTS delivery_mode text NOT NULL DEFAULT 'national',
  ADD COLUMN IF NOT EXISTS local_delivery_price numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS local_delivery_free_over numeric(12,2),
  ADD COLUMN IF NOT EXISTS clothing_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS visit_count bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS yalidine_api_id text,
  ADD COLUMN IF NOT EXISTS yalidine_api_token text,
  ADD COLUMN IF NOT EXISTS preferred_carrier text;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock integer,
  ADD COLUMN IF NOT EXISTS track_stock boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  color text,
  pointure text,
  taille text,
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants(product_id);
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_variants_owner_all ON public.product_variants;
CREATE POLICY product_variants_owner_all ON public.product_variants
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND public.is_store_owner(p.store_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND public.is_store_owner(p.store_id)));

CREATE TABLE IF NOT EXISTS public.store_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  channel text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(store_id, channel)
);
CREATE INDEX IF NOT EXISTS idx_store_channels_store ON public.store_channels(store_id);
ALTER TABLE public.store_channels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS store_channels_owner_select ON public.store_channels;
DROP POLICY IF EXISTS store_channels_owner_write ON public.store_channels;
CREATE POLICY store_channels_owner_select ON public.store_channels
  FOR SELECT TO authenticated USING (public.is_store_owner(store_id) OR public.is_super_admin());
CREATE POLICY store_channels_owner_write ON public.store_channels
  FOR ALL TO authenticated
  USING (public.is_store_owner(store_id) OR public.is_super_admin())
  WITH CHECK (public.is_store_owner(store_id) OR public.is_super_admin());

CREATE TABLE IF NOT EXISTS public.subscription_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  plan_type text,
  plan_requested text NOT NULL DEFAULT 'pro' CHECK (plan_requested IN ('pro','pro_shipping')),
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','yearly')),
  amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'baridimob',
  receipt_url text,
  cardless_code text,
  operation_number text,
  phone_number text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_subscription_requests_status ON public.subscription_requests(status, created_at DESC);
ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS subscription_requests_select_own ON public.subscription_requests;
DROP POLICY IF EXISTS subscription_requests_insert_own ON public.subscription_requests;
DROP POLICY IF EXISTS subscription_requests_admin_update ON public.subscription_requests;
CREATE POLICY subscription_requests_select_own ON public.subscription_requests
  FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.is_super_admin());
CREATE POLICY subscription_requests_insert_own ON public.subscription_requests
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));
CREATE POLICY subscription_requests_admin_update ON public.subscription_requests
  FOR UPDATE TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- Atomic, privacy-preserving visit counter. No visitor identity is stored.
CREATE OR REPLACE FUNCTION public.increment_store_visit(p_slug text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count bigint;
BEGIN
  UPDATE public.stores
  SET visit_count = COALESCE(visit_count,0) + 1
  WHERE slug = p_slug AND is_published = true
  RETURNING visit_count INTO v_count;
  RETURN COALESCE(v_count,0);
END;
$$;
GRANT EXECUTE ON FUNCTION public.increment_store_visit(text) TO anon, authenticated;
