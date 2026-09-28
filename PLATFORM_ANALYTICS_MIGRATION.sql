-- Dzair Store — public platform analytics for the landing page.
-- Privacy-preserving: no IP address, name, email, phone or visitor identity is stored.

CREATE TABLE IF NOT EXISTS public.platform_visit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visited_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_visit_events_visited_at
  ON public.platform_visit_events(visited_at DESC);

ALTER TABLE public.platform_visit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_visit_events_no_public_select ON public.platform_visit_events;
DROP POLICY IF EXISTS platform_visit_events_no_public_insert ON public.platform_visit_events;

-- Public visitors write through the RPC below; the raw table stays private.

CREATE OR REPLACE FUNCTION public.record_platform_visit()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count bigint;
BEGIN
  INSERT INTO public.platform_visit_events DEFAULT VALUES;
  SELECT COUNT(*) INTO v_count FROM public.platform_visit_events;
  RETURN COALESCE(v_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_platform_stats()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'stores', (
      SELECT COUNT(*)
      FROM public.stores
      WHERE is_published = true
    ),
    'new_stores', (
      SELECT COUNT(*)
      FROM public.stores
      WHERE is_published = true
        AND created_at >= now() - interval '30 days'
    ),
    'products', (
      SELECT COUNT(*)
      FROM public.products p
      JOIN public.stores s ON s.id = p.store_id
      WHERE s.is_published = true
        AND p.is_active = true
    ),
    'visits', (
      SELECT COUNT(*) FROM public.platform_visit_events
    ),
    'store_visits', (
      SELECT COALESCE(SUM(COALESCE(visit_count, 0)), 0)
      FROM public.stores
      WHERE is_published = true
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.record_platform_visit() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_platform_stats() TO anon, authenticated;
