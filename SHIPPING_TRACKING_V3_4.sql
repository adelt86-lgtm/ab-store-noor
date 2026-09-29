-- DZAIR STORE V3.4 — SHIPPING TRACKING SYNC FOUNDATION
-- Run AFTER SHIPPING_TRACKING_V3_3.sql

BEGIN;

ALTER TABLE public.shipping_shipments
  ADD COLUMN IF NOT EXISTS tracking_sync_at timestamptz;

ALTER TABLE public.shipping_shipments
  ADD COLUMN IF NOT EXISTS tracking_sync_error text;

CREATE INDEX IF NOT EXISTS shipping_shipments_tracking_sync_idx
  ON public.shipping_shipments(store_id, tracking_sync_at);

COMMIT;
