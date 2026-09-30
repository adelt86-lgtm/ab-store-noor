ALTER TABLE public.shipping_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shipping_connections_owner_select ON public.shipping_connections;
DROP POLICY IF EXISTS shipping_connections_owner_insert ON public.shipping_connections;
DROP POLICY IF EXISTS shipping_connections_owner_update ON public.shipping_connections;
DROP POLICY IF EXISTS shipping_connections_owner_delete ON public.shipping_connections;

CREATE POLICY shipping_connections_owner_select
ON public.shipping_connections
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = shipping_connections.store_id
    AND s.owner_id = auth.uid()
  )
);

CREATE POLICY shipping_connections_owner_insert
ON public.shipping_connections
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = shipping_connections.store_id
    AND s.owner_id = auth.uid()
  )
);

CREATE POLICY shipping_connections_owner_update
ON public.shipping_connections
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = shipping_connections.store_id
    AND s.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = shipping_connections.store_id
    AND s.owner_id = auth.uid()
  )
);

CREATE POLICY shipping_connections_owner_delete
ON public.shipping_connections
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = shipping_connections.store_id
    AND s.owner_id = auth.uid()
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipping_connections TO authenticated;
