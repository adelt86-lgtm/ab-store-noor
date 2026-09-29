-- DZAIR STORE V3.3 — SHIPPING TRACKING FOUNDATION
-- Run AFTER SHIPPING_ENGINE_V3_2_1_HARDENING.sql

BEGIN;

ALTER TABLE public.shipping_shipments
  ADD COLUMN IF NOT EXISTS tracking_status text;

ALTER TABLE public.shipping_shipments
  ADD COLUMN IF NOT EXISTS last_tracking_at timestamptz;

ALTER TABLE public.shipping_shipments
  ADD COLUMN IF NOT EXISTS tracking_url text;

CREATE INDEX IF NOT EXISTS shipping_shipments_tracking_status_idx
  ON public.shipping_shipments(store_id, tracking_status);

COMMIT;
