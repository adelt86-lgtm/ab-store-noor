-- Dzair Store V2.7 — social links for Facebook / Instagram / Telegram / TikTok
-- Run once in Supabase SQL Editor after the existing schema migrations.

BEGIN;

ALTER TABLE public.store_channels
  ADD COLUMN IF NOT EXISTS url text;

DROP POLICY IF EXISTS store_channels_public_select ON public.store_channels;
CREATE POLICY store_channels_public_select
  ON public.store_channels
  FOR SELECT TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = store_channels.store_id
        AND s.is_published = true
    )
  );

COMMIT;
