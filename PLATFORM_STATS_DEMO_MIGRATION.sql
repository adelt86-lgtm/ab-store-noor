-- Dzair Store — platform landing statistics control.
-- Transparent demo mode: demo values are explicitly labeled on the landing page.

CREATE TABLE IF NOT EXISTS public.platform_stats_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  demo_mode boolean NOT NULL DEFAULT true,
  demo_visits bigint NOT NULL DEFAULT 12840 CHECK (demo_visits >= 0),
  demo_stores bigint NOT NULL DEFAULT 286 CHECK (demo_stores >= 0),
  demo_new_stores bigint NOT NULL DEFAULT 34 CHECK (demo_new_stores >= 0),
  demo_products bigint NOT NULL DEFAULT 1240 CHECK (demo_products >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.platform_stats_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.platform_stats_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS platform_stats_settings_admin_select ON public.platform_stats_settings;
DROP POLICY IF EXISTS platform_stats_settings_admin_update ON public.platform_stats_settings;
CREATE POLICY platform_stats_settings_admin_select ON public.platform_stats_settings
FOR SELECT TO authenticated USING (public.is_super_admin());
CREATE POLICY platform_stats_settings_admin_update ON public.platform_stats_settings
FOR UPDATE TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE OR REPLACE FUNCTION public.get_platform_stats_settings()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.is_super_admin() THEN
    jsonb_build_object(
      'demo_mode', demo_mode, 'demo_visits', demo_visits, 'demo_stores', demo_stores,
      'demo_new_stores', demo_new_stores, 'demo_products', demo_products
    ) ELSE NULL END
  FROM public.platform_stats_settings WHERE id = 1;
$$;

CREATE OR REPLACE FUNCTION public.update_platform_stats_settings(
  p_demo_mode boolean, p_demo_visits bigint, p_demo_stores bigint,
  p_demo_new_stores bigint, p_demo_products bigint
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF p_demo_visits < 0 OR p_demo_stores < 0 OR p_demo_new_stores < 0 OR p_demo_products < 0 THEN
    RAISE EXCEPTION 'invalid demo statistics';
  END IF;
  UPDATE public.platform_stats_settings
  SET demo_mode = p_demo_mode, demo_visits = p_demo_visits, demo_stores = p_demo_stores,
      demo_new_stores = p_demo_new_stores, demo_products = p_demo_products, updated_at = now()
  WHERE id = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_platform_stats()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN COALESCE(ps.demo_mode, true) THEN
    jsonb_build_object(
      'demo_mode', true, 'stores', ps.demo_stores, 'new_stores', ps.demo_new_stores,
      'products', ps.demo_products, 'visits', ps.demo_visits,
      'store_visits', COALESCE((SELECT SUM(COALESCE(visit_count,0)) FROM public.stores WHERE is_published = true),0)
    )
  ELSE
    jsonb_build_object(
      'demo_mode', false,
      'stores', (SELECT COUNT(*) FROM public.stores WHERE is_published = true),
      'new_stores', (SELECT COUNT(*) FROM public.stores WHERE is_published = true AND created_at >= now() - interval '30 days'),
      'products', (SELECT COUNT(*) FROM public.products p JOIN public.stores s ON s.id=p.store_id WHERE s.is_published=true AND p.is_active=true),
      'visits', (SELECT COUNT(*) FROM public.platform_visit_events),
      'store_visits', COALESCE((SELECT SUM(COALESCE(visit_count,0)) FROM public.stores WHERE is_published=true),0)
    )
  END FROM public.platform_stats_settings ps WHERE ps.id = 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_stats_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_platform_stats_settings(boolean,bigint,bigint,bigint,bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_platform_stats() TO anon, authenticated;
