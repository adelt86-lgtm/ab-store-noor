-- AB Store Noor · order_items for multi-product cart orders
-- Run AFTER ORDERS_MIGRATION.sql in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id text,
  product_name text NOT NULL,
  quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Merchant can read items for orders of their stores
DROP POLICY IF EXISTS order_items_select_owner ON public.order_items;
CREATE POLICY order_items_select_owner ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND public.is_store_owner(o.store_id)
    )
  );

-- Public insert only for published stores (via order path)
DROP POLICY IF EXISTS order_items_insert_public ON public.order_items;
CREATE POLICY order_items_insert_public ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.stores s ON s.id = o.store_id
      WHERE o.id = order_id AND s.is_published = true
    )
  );

-- Optional: allow merchant delete with order
DROP POLICY IF EXISTS order_items_delete_owner ON public.order_items;
CREATE POLICY order_items_delete_owner ON public.order_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND public.is_store_owner(o.store_id)
    )
  );

-- Shipping fields on orders (for Pro Shipping later + tracking display)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS shipping_company text,
  ADD COLUMN IF NOT EXISTS shipping_status text,
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS label_url text,
  ADD COLUMN IF NOT EXISTS address text;

-- Plan extension: free | pro | pro_shipping
DO $$ BEGIN
  ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_plan_check;
  ALTER TABLE public.stores ADD CONSTRAINT stores_plan_check
    CHECK (plan IN ('free', 'pro', 'pro_shipping'));
EXCEPTION WHEN others THEN NULL;
END $$;

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS shipping_enabled boolean NOT NULL DEFAULT false;

COMMENT ON TABLE public.order_items IS 'Line items for multi-product cart orders';
