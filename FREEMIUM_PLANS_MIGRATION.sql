-- AB Store Noor · Freemium plans + branding
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS merchant_logo_url text,
  ADD COLUMN IF NOT EXISTS hide_platform_brand boolean NOT NULL DEFAULT false;

-- free | pro  (extend later if needed)
DO $$ BEGIN
  ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_plan_check;
  ALTER TABLE public.stores ADD CONSTRAINT stores_plan_check CHECK (plan IN ('free', 'pro'));
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.plan_upgrade_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES auth.users(id),
  plan_requested text NOT NULL DEFAULT 'pro',
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  amount_dzd int NOT NULL,
  payment_method text NOT NULL DEFAULT 'baridimob' CHECK (payment_method IN ('baridimob', 'gab_retrait')),
  receipt_url text,
  gab_code text,
  phone text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_upgrade_store ON public.plan_upgrade_requests(store_id);
CREATE INDEX IF NOT EXISTS idx_upgrade_status ON public.plan_upgrade_requests(status);

ALTER TABLE public.plan_upgrade_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS upgrade_select_own ON public.plan_upgrade_requests;
CREATE POLICY upgrade_select_own ON public.plan_upgrade_requests
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_super_admin());

DROP POLICY IF EXISTS upgrade_insert_own ON public.plan_upgrade_requests;
CREATE POLICY upgrade_insert_own ON public.plan_upgrade_requests
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS upgrade_admin_update ON public.plan_upgrade_requests;
CREATE POLICY upgrade_admin_update ON public.plan_upgrade_requests
  FOR UPDATE TO authenticated
  USING (public.is_super_admin());

-- Helper: is store effectively Pro?
CREATE OR REPLACE FUNCTION public.store_is_pro(p_store public.stores)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT p_store.plan = 'pro'
    AND (p_store.plan_expires_at IS NULL OR p_store.plan_expires_at > now());
$$;
