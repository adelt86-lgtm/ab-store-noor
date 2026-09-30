ALTER TABLE public.shipping_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_tracking_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shipping_shipments_owner_select ON public.shipping_shipments;
DROP POLICY IF EXISTS shipping_shipments_owner_insert ON public.shipping_shipments;
DROP POLICY IF EXISTS shipping_shipments_owner_update ON public.shipping_shipments;

CREATE POLICY shipping_shipments_owner_select
ON public.shipping_shipments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = shipping_shipments.store_id
    AND s.owner_id = auth.uid()
  )
);

CREATE POLICY shipping_shipments_owner_insert
ON public.shipping_shipments
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = shipping_shipments.store_id
    AND s.owner_id = auth.uid()
  )
);

CREATE POLICY shipping_shipments_owner_update
ON public.shipping_shipments
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = shipping_shipments.store_id
    AND s.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = shipping_shipments.store_id
    AND s.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS shipping_tracking_events_owner_select ON public.shipping_tracking_events;
DROP POLICY IF EXISTS shipping_tracking_events_owner_insert ON public.shipping_tracking_events;

CREATE POLICY shipping_tracking_events_owner_select
ON public.shipping_tracking_events
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.shipping_shipments sh
    JOIN public.stores s ON s.id = sh.store_id
    WHERE sh.id = shipping_tracking_events.shipment_id
    AND s.owner_id = auth.uid()
  )
);

CREATE POLICY shipping_tracking_events_owner_insert
ON public.shipping_tracking_events
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.shipping_shipments sh
    JOIN public.stores s ON s.id = sh.store_id
    WHERE sh.id = shipping_tracking_events.shipment_id
    AND s.owner_id = auth.uid()
  )
);

GRANT SELECT, INSERT, UPDATE ON public.shipping_shipments TO authenticated;
GRANT SELECT, INSERT ON public.shipping_tracking_events TO authenticated;
