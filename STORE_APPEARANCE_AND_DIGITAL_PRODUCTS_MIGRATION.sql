-- Dzair Store appearance + digital product metadata.
-- Run once in Supabase SQL Editor before deploying the UI that uses these fields.
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS store_theme text NOT NULL DEFAULT 'classic'
    CHECK (store_theme IN ('classic','fashion','beauty','modern')),
  ADD COLUMN IF NOT EXISTS store_theme_mode text NOT NULL DEFAULT 'system'
    CHECK (store_theme_mode IN ('light','dark','system'));

-- Metadata only: this does not turn COD into online payment and does not
-- expose a digital file. Secure delivery must only be enabled after a payment
-- provider/webhook and private Storage download flow are configured.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS fulfillment_type text NOT NULL DEFAULT 'physical'
    CHECK (fulfillment_type IN ('physical','digital')),
  ADD COLUMN IF NOT EXISTS digital_delivery_note text;

COMMENT ON COLUMN public.products.fulfillment_type IS 'physical or digital; digital delivery requires verified payment before any file is shared.';
COMMENT ON COLUMN public.products.digital_delivery_note IS 'Merchant instructions for manual digital fulfillment; do not put private file URLs here.';
