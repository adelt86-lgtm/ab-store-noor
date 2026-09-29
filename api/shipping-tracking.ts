import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

type Provider = 'yalidine' | 'zr_express' | 'maystro' | 'noest' | 'dhd';

function env(name: string) { return process.env[name] || ''; }

async function authUser(req: VercelRequest) {
  const url = env('SUPABASE_URL');
  const anon = env('SUPABASE_ANON_KEY');
  const auth = String(req.headers.authorization || '');
  if (!url || !anon || !auth.startsWith('Bearer ')) throw new Error('unauthorized');
  const client = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data } = await client.auth.getUser();
  if (!data.user) throw new Error('unauthorized');
  return data.user;
}

function db() {
  const url = env('SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('service_role_not_configured');
  return createClient(url, key);
}

function cors(req: VercelRequest, res: VercelResponse) {
  const origin = String(req.headers.origin || '');
  const allowed = env('APP_ORIGIN').replace(/\/$/, '');
  if (allowed && origin === allowed) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
}

function normalizeStatus(value: unknown) {
  const s = String(value || '').trim().toLowerCase();
  if (!s) return 'unknown';
  if (['delivered', 'livre', 'livré', 'delivered_to_customer', 'done'].includes(s)) return 'delivered';
  if (['returned', 'retour', 'retourné', 'return'].includes(s)) return 'returned';
  if (['cancelled', 'canceled', 'annulé', 'cancel'].includes(s)) return 'cancelled';
  if (['in_transit', 'transit', 'en transit', 'shipped', 'acheminement'].includes(s)) return 'in_transit';
  if (['ready_for_dispatch', 'ready', 'pret', 'prêt'].includes(s)) return 'ready_for_dispatch';
  if (['created', 'créé', 'new'].includes(s)) return 'created';
  if (['error', 'failed', 'échec'].includes(s)) return 'error';
  return s;
}

function trackingUrl(provider: Provider, tracking: string | null) {
  if (!tracking) return null;
  if (provider === 'yalidine') return 'https://track.yalidine.com/suivre-un-colis/';
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  try {
    const user = await authUser(req);
    const database = db();
    const orderId = String(req.query.order_id || '').trim();
    const tracking = String(req.query.tracking || '').trim();
    if (!orderId && !tracking) return res.status(400).json({ ok: false, error: 'order_id_or_tracking_required' });

    let query = database.from('shipping_shipments').select('id,order_id,store_id,provider,tracking_number,status,tracking_status,last_tracking_at,tracking_url,provider_request_id,last_error,created_at,updated_at');
    if (orderId) query = query.eq('order_id', orderId);
    else query = query.eq('tracking_number', tracking);
    const { data: shipment, error } = await query.maybeSingle();
    if (error) throw error;
    if (!shipment) return res.status(404).json({ ok: false, error: 'shipment_not_found' });

    const { data: store } = await database.from('stores').select('id').eq('id', shipment.store_id).eq('owner_id', user.id).maybeSingle();
    if (!store) return res.status(403).json({ ok: false, error: 'forbidden' });

    const { data: events, error: eventsError } = await database
      .from('shipping_tracking_events')
      .select('id,tracking_number,status,event_key,event_at,source,raw,created_at')
      .eq('shipment_id', shipment.id)
      .order('event_at', { ascending: false });
    if (eventsError) throw eventsError;

    const latest = events?.[0];
    const currentStatus = normalizeStatus(shipment.tracking_status || latest?.status || shipment.status);
    return res.json({
      ok: true,
      tracking: {
        shipment_id: shipment.id,
        order_id: shipment.order_id,
        provider: shipment.provider,
        tracking_number: shipment.tracking_number,
        status: currentStatus,
        raw_status: shipment.tracking_status || latest?.status || shipment.status,
        last_tracking_at: shipment.last_tracking_at || latest?.event_at || null,
        tracking_url: shipment.tracking_url || trackingUrl(shipment.provider as Provider, shipment.tracking_number),
        provider_request_id: shipment.provider_request_id || null,
        last_error: shipment.last_error || null,
        events: (events || []).map((event: any) => ({
          ...event,
          normalized_status: normalizeStatus(event.status),
        })),
      },
    });
  } catch (e: any) {
    const message = String(e?.message || e);
    return res.status(message === 'unauthorized' ? 401 : message === 'service_role_not_configured' ? 503 : 500)
      .json({ ok: false, error: message });
  }
}
