-- =====================================================================
-- CAPTCHA enforcement (Turnstile) — run ONLY AFTER:
--   1) the new code is deployed and Vercel shows "Ready"
--   2) VITE_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY are set in Vercel
--   3) you placed one test order from the live store successfully
-- Effect: browsers (anon/authenticated) can no longer call create_cart_order
-- directly, so the only way to create an order is /api/create-order,
-- which verifies the captcha first.
-- =====================================================================
BEGIN;
REVOKE EXECUTE ON FUNCTION public.create_cart_order(uuid,text,text,integer,text,text,text,text,numeric,jsonb) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.create_cart_order(uuid,text,text,integer,text,text,text,text,numeric,jsonb) TO service_role;
COMMIT;

-- VERIFY (expected: permission denied)
--   SET ROLE anon;
--   SELECT public.create_cart_order('00000000-0000-0000-0000-000000000000','x','0550000000',16,'x',null,null,'home',0,'[]'::jsonb);
--   RESET ROLE;

-- ROLLBACK (emergency: orders failing after this change)
--   GRANT EXECUTE ON FUNCTION public.create_cart_order(uuid,text,text,integer,text,text,text,text,numeric,jsonb) TO anon, authenticated;
