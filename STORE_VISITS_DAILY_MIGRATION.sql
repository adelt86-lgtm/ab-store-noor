-- Dzair Store · Daily store visit analytics

CREATE TABLE IF NOT EXISTS public.store_visit_daily (
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  visit_count bigint NOT NULL DEFAULT 0 CHECK (visit_count >= 0),
  PRIMARY KEY (store_id, visit_date)
);

CREATE INDEX IF NOT EXISTS idx_store_visit_daily_store_date
  ON public.store_visit_daily(store_id, visit_date DESC);

ALTER TABLE public.store_visit_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS store_visit_daily_owner_select
  ON public.store_visit_daily;

CREATE POLICY store_visit_daily_owner_select
  ON public.store_visit_daily
  FOR SELECT
  TO authenticated
  USING (
    public.is_store_owner(store_id)
    OR public.is_super_admin()
  );
