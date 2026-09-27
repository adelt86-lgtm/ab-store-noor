-- DZAIR STORE: unify paid plan selection and approval
-- Run once in Supabase SQL Editor. Keeps existing subscription_requests rows compatible.

ALTER TABLE public.subscription_requests
  ADD COLUMN IF NOT EXISTS plan_requested text NOT NULL DEFAULT 'pro';

ALTER TABLE public.subscription_requests
  DROP CONSTRAINT IF EXISTS subscription_requests_plan_requested_check;

ALTER TABLE public.subscription_requests
  ADD CONSTRAINT subscription_requests_plan_requested_check
  CHECK (plan_requested IN ('pro', 'pro_shipping'));

ALTER TABLE public.stores
  DROP CONSTRAINT IF EXISTS stores_plan_check;

ALTER TABLE public.stores
  ADD CONSTRAINT stores_plan_check
  CHECK (plan IN ('free', 'pro', 'pro_shipping'));

-- Three-argument RPC so Super Admin can approve either paid plan.
CREATE OR REPLACE FUNCTION public.approve_subscription_request(
  p_request_id uuid,
  p_billing_cycle text,
  p_plan_requested text DEFAULT 'pro'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id uuid;
  v_plan text;
  v_expires timestamptz;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_plan_requested NOT IN ('pro', 'pro_shipping') THEN
    RAISE EXCEPTION 'invalid plan';
  END IF;

  IF p_billing_cycle NOT IN ('monthly', 'yearly') THEN
    RAISE EXCEPTION 'invalid billing cycle';
  END IF;

  SELECT store_id, COALESCE(plan_requested, 'pro')
    INTO v_store_id, v_plan
  FROM public.subscription_requests
  WHERE id = p_request_id AND status = 'pending'
  FOR UPDATE;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'subscription request not found or already reviewed';
  END IF;

  v_plan := p_plan_requested;
  v_expires := CASE
    WHEN p_billing_cycle = 'yearly' THEN now() + interval '1 year'
    ELSE now() + interval '1 month'
  END;

  UPDATE public.stores
  SET plan = v_plan, plan_expires_at = v_expires
  WHERE id = v_store_id;

  UPDATE public.subscription_requests
  SET status = 'approved',
      plan_requested = v_plan,
      billing_cycle = p_billing_cycle,
      reviewed_at = now()
  WHERE id = p_request_id;
END;
$$;
