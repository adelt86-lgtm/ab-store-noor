-- السماح للـ API بتحديث حقول الشحن فقط عبر دالة آمنة
CREATE OR REPLACE FUNCTION public.mark_order_shipped(
  p_order_id uuid,
  p_tracking_number text,
  p_shipping_company text,
  p_shipping_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id uuid;
BEGIN
  SELECT store_id
  INTO v_store_id
  FROM public.orders
  WHERE id = p_order_id;

  IF v_store_id IS NULL OR NOT public.is_store_owner(v_store_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.orders
  SET
    tracking_number = p_tracking_number,
    shipping_company = p_shipping_company,
    shipping_status = p_shipping_status,
    status = 'shipped'
  WHERE id = p_order_id;
END;
$$;

GRANT EXECUTE
ON FUNCTION public.mark_order_shipped(uuid,text,text,text)
TO authenticated;
