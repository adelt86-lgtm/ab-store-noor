import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { trackShipment, type TrackingProvider } from './shipping-tracking-engine.js';

function env(name: string) {
  return process.env[name] || '';
}

async function authUser(req: VercelRequest) {
  const url = env('SUPABASE_URL');
  const anon = env('SUPABASE_ANON_KEY');
  const auth = String(req.headers.authorization || '');

  if (!url || !anon || !auth.startsWith('Bearer ')) {
    throw new Error('unauthorized');
  }

  const client = createClient(url, anon, {
    global: { headers: { Authorization: auth } },
  });

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

  if (allowed && origin === allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(req, res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  try {
    const user = await authUser(req);
    const database = db();

    const body = typeof req.body === 'object' && req.body ? req.body : {};
    const orderId = String(body.order_id || '').trim();
    const trackingNumber = String(body.tracking || '').trim();

    if (!orderId && !trackingNumber) {
      return res.status(400).json({
        ok: false,
        error: 'order_id_or_tracking_required',
      });
    }

    let query = database
      .from('shipping_shipments')
      .select('id,order_id,store_id,provider,tracking_number,status');

    if (orderId) query = query.eq('order_id', orderId);
    else query = query.eq('tracking_number', trackingNumber);

    const { data: shipment, error: shipmentError } =
      await query.maybeSingle();

    if (shipmentError) throw shipmentError;

    if (!shipment) {
      return res.status(404).json({
        ok: false,
        error: 'shipment_not_found',
      });
    }

    const { data: store } = await database
      .from('stores')
      .select('id')
      .eq('id', shipment.store_id)
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!store) {
      return res.status(403).json({
        ok: false,
        error: 'forbidden',
      });
    }

    if (!shipment.tracking_number) {
      return res.status(400).json({
        ok: false,
        error: 'tracking_number_missing',
      });
    }

    const provider = shipment.provider as TrackingProvider;

    const { data: connection, error: connectionError } =
      await database
        .from('shipping_connections')
        .select('credentials_encrypted,status')
        .eq('store_id', shipment.store_id)
        .eq('provider', provider)
        .maybeSingle();

    if (connectionError) throw connectionError;

    if (!connection || connection.status !== 'connected') {
      return res.status(409).json({
        ok: false,
        error: 'shipping_connection_not_connected',
      });
    }

    try {
      const result = await trackShipment(
        provider,
        connection.credentials_encrypted,
        shipment.tracking_number,
      );

      const now = new Date().toISOString();

      const { error: updateError } = await database
        .from('shipping_shipments')
        .update({
          tracking_status: result.status,
          last_tracking_at: result.event_at || now,
          tracking_sync_at: now,
          tracking_sync_error: null,
          tracking_url:
            provider === 'yalidine'
              ? 'https://track.yalidine.com/suivre-un-colis/'
              : null,
          updated_at: now,
        })
        .eq('id', shipment.id);

      if (updateError) throw updateError;

      const { error: eventError } = await database
        .from('shipping_tracking_events')
        .upsert(
          {
            shipment_id: shipment.id,
            tracking_number: result.tracking_number,
            status: result.raw_status,
            event_key: result.event_key,
            event_at: result.event_at || now,
            source: 'provider_sync',
            raw: result.raw || null,
          },
          {
            onConflict: 'shipment_id,event_key,event_at',
            ignoreDuplicates: true,
          },
        );

      if (eventError) throw eventError;

      return res.json({
        ok: true,
        tracking: result,
      });
    } catch (syncError: any) {
      const message = String(syncError?.message || syncError);
      const now = new Date().toISOString();

      await database
        .from('shipping_shipments')
        .update({
          tracking_sync_at: now,
          tracking_sync_error: message,
          updated_at: now,
        })
        .eq('id', shipment.id);

      return res.status(502).json({
        ok: false,
        error: 'tracking_sync_failed',
        message,
      });
    }
  } catch (e: any) {
    const message = String(e?.message || e);

    return res
      .status(
        message === 'unauthorized'
          ? 401
          : message === 'service_role_not_configured'
            ? 503
            : 500,
      )
      .json({
        ok: false,
        error: message,
      });
  }
}
