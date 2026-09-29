import { supabase } from './supabase';

export type TrackingStatus =
  | 'created'
  | 'ready_for_dispatch'
  | 'in_transit'
  | 'delivered'
  | 'returned'
  | 'cancelled'
  | 'error'
  | 'unknown';

export type TrackingEvent = {
  id: string;
  tracking_number: string | null;
  status: string;
  normalized_status: TrackingStatus | string;
  event_key: string | null;
  event_at: string;
  source: string;
};

export type TrackingSnapshot = {
  shipment_id: string;
  order_id: string;
  provider: string;
  tracking_number: string | null;
  status: TrackingStatus | string;
  raw_status: string;
  last_tracking_at: string | null;
  tracking_url: string | null;
  provider_request_id: string | null;
  last_error: string | null;
  events: TrackingEvent[];
};

export async function loadShipmentTracking(orderId: string): Promise<TrackingSnapshot> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('no_auth');

  const res = await fetch(`/api/shipping-tracking?order_id=${encodeURIComponent(orderId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || !out?.ok) throw new Error(out?.message || out?.error || `http_${res.status}`);
  return out.tracking as TrackingSnapshot;
}
