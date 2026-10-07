-- Dzair Store · real storefront visit counter
-- Store owner and Super Admin visits are not marketing/storefront visits.
-- External/anonymous/customer visits remain counted.

CREATE OR REPLACE FUNCTION public.increment_store_visit(p_slug text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count bigint;
  v_owner uuid;
  v_store_id uuid;
BEGIN
  SELECT id, owner_id, COALESCE(visit_count,0)
    INTO v_store_id, v_owner, v_count
  FROM public.stores
  WHERE slug = p_slug AND is_published = true;

  IF v_store_id IS NULL THEN
    RETURN 0;
  END IF;

  -- A merchant previewing their own public store is not a customer visit.
  -- Super Admin browsing stores for administration is excluded as well.
  IF auth.uid() IS NOT NULL
     AND (auth.uid() = v_owner OR public.is_super_admin()) THEN
    RETURN v_count;
  END IF;

  UPDATE public.stores
  SET visit_count = COALESCE(visit_count,0) + 1
  WHERE id = v_store_id
  RETURNING visit_count INTO v_count;

  INSERT INTO public.store_visit_daily (store_id, visit_date, visit_count)
  VALUES (v_store_id, CURRENT_DATE, 1)
  ON CONFLICT (store_id, visit_date)
  DO UPDATE SET visit_count = public.store_visit_daily.visit_count + 1;

  RETURN COALESCE(v_count,0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_store_visit(text) TO anon, authenticated;
