-- DZAIR STORE V3.2.1 — SHIPPING ENGINE HARDENING
-- Run AFTER SHIPPING_ENGINE_V3_2.sql

BEGIN;

ALTER TABLE public.shipping_shipments
  ADD COLUMN IF NOT EXISTS provider_request_id text;

ALTER TABLE public.shipping_shipments
  DROP CONSTRAINT IF EXISTS shipping_shipments_status_check;

ALTER TABLE public.shipping_shipments
  ADD CONSTRAINT shipping_shipments_status_check
  CHECK (status IN ('creating','created','error','unknown','cancelled'));

CREATE INDEX IF NOT EXISTS shipping_shipments_request_idx
  ON public.shipping_shipments(provider_request_id)
  WHERE provider_request_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS shipping_tracking_events_dedupe_idx
  ON public.shipping_tracking_events(shipment_id,event_key,event_at)
  WHERE event_key IS NOT NULL;

COMMENT ON COLUMN public.shipping_shipments.status IS
'creating=carrier request started; created=tracking confirmed; error=request definitively failed; unknown=carrier outcome uncertain; cancelled=shipment cancelled';

COMMENT ON COLUMN public.shipping_shipments.provider_request_id IS
'Provider-side shipment/reference identifier when available. Never store carrier credentials here.';

COMMIT;
