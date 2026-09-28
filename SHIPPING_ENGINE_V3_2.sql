-- DZAIR STORE V3.2 — SHIPPING ENGINE
-- Run after the base Dzair Store schema and previous shipping migration.
-- IMPORTANT: set Vercel/Server env SHIPPING_CREDENTIALS_KEY to a 32-byte base64 secret
-- before merchants connect carriers. Generate one with: openssl rand -base64 32

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.shipping_providers (
  id text PRIMARY KEY,
  name text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.shipping_providers(id,name) VALUES
 ('yalidine','Yalidine Express'),
 ('zr_express','ZR Express'),
 ('maystro','Maystro Delivery'),
 ('noest','NOEST Express'),
 ('dhd','DHD Livraison')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.shipping_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  provider text NOT NULL REFERENCES public.shipping_providers(id),
  credentials_encrypted text,
  status text NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected','disconnected','error')),
  last_tested_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(store_id,provider)
);

-- V3.1 stored raw JSON credentials. Clear them; merchants must reconnect.
ALTER TABLE public.shipping_connections ADD COLUMN IF NOT EXISTS credentials_encrypted text;
ALTER TABLE public.shipping_connections ADD COLUMN IF NOT EXISTS credentials jsonb;
UPDATE public.shipping_connections SET credentials = '{}'::jsonb WHERE credentials IS NOT NULL;
ALTER TABLE public.shipping_connections DROP COLUMN IF EXISTS credentials;

CREATE TABLE IF NOT EXISTS public.shipping_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  provider text NOT NULL REFERENCES public.shipping_providers(id),
  tracking_number text,
  status text NOT NULL DEFAULT 'creating',
  idempotency_key text NOT NULL,
  provider_response jsonb,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id),
  UNIQUE(idempotency_key)
);

CREATE INDEX IF NOT EXISTS shipping_shipments_store_idx ON public.shipping_shipments(store_id,created_at DESC);
CREATE INDEX IF NOT EXISTS shipping_shipments_tracking_idx ON public.shipping_shipments(tracking_number);

CREATE TABLE IF NOT EXISTS public.shipping_tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipping_shipments(id) ON DELETE CASCADE,
  tracking_number text,
  status text NOT NULL,
  event_key text,
  event_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'provider',
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shipping_tracking_events_shipment_idx ON public.shipping_tracking_events(shipment_id,event_at DESC);

ALTER TABLE public.shipping_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_providers ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.shipping_connections FROM anon,authenticated;
REVOKE ALL ON public.shipping_shipments FROM anon,authenticated;
REVOKE ALL ON public.shipping_tracking_events FROM anon,authenticated;

DROP POLICY IF EXISTS shipping_providers_read ON public.shipping_providers;
CREATE POLICY shipping_providers_read ON public.shipping_providers
FOR SELECT TO authenticated USING (enabled=true);

DROP TRIGGER IF EXISTS shipping_connections_updated_at ON public.shipping_connections;
CREATE OR REPLACE FUNCTION public.set_shipping_connections_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END; $$;
CREATE TRIGGER shipping_connections_updated_at BEFORE UPDATE ON public.shipping_connections
FOR EACH ROW EXECUTE FUNCTION public.set_shipping_connections_updated_at();

DROP TRIGGER IF EXISTS shipping_shipments_updated_at ON public.shipping_shipments;
CREATE OR REPLACE FUNCTION public.set_shipping_shipments_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END; $$;
CREATE TRIGGER shipping_shipments_updated_at BEFORE UPDATE ON public.shipping_shipments
FOR EACH ROW EXECUTE FUNCTION public.set_shipping_shipments_updated_at();

-- Remove legacy credential columns from the store if they are no longer needed by the application.
-- Kept as nullable for backward compatibility; application code must not read them.
COMMENT ON COLUMN public.shipping_connections.credentials_encrypted IS 'AES-256-GCM encrypted carrier credentials. Server-only; never expose to browser.';
COMMENT ON COLUMN public.shipping_shipments.idempotency_key IS 'Unique request key preventing duplicate carrier shipments.';

COMMIT;
