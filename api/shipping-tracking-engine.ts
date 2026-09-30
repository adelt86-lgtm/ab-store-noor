import { decryptCredentials } from './shipping-crypto.js';

export type TrackingProvider =
  | 'yalidine'
  | 'zr_express'
  | 'maystro'
  | 'noest'
  | 'dhd';

export type TrackingResult = {
  tracking_number: string;
  status: string;
  raw_status: string;
  event_key?: string | null;
  event_at?: string | null;
  provider_request_id?: string | null;
  raw?: unknown;
};

export type TrackingContext = {
  tracking_number: string;
  credentials: Record<string, string>;
};

const YALIDINE_STATUS_MAP: Record<string, string> = {
  'Pas encore expédié': 'pending',
  'A vérifier': 'pending',
  'Pas encore ramassé': 'pending',
  'En passation': 'picked_up',
  'Ramassé': 'picked_up',
  'Bloqué': 'exception',
  'Débloqué': 'in_transit',
  'Transfert': 'in_transit',
  'Expédié': 'in_transit',
  'Centre': 'in_transit',
  'En localisation': 'in_transit',
  'Vers Wilaya': 'in_transit',
  'En transit': 'in_transit',
  'Reçu à Wilaya': 'in_transit',
  'Prêt pour livreur': 'out_for_delivery',
  'Sorti en livraison': 'out_for_delivery',
  'En alerte': 'failed_delivery',
  'Echèc livraison': 'failed_delivery',
  'Echange échoué': 'failed_delivery',
  'Retour vers centre': 'returning',
  'Retourné au centre': 'returning',
  'Retour transfert': 'returning',
  'Retour groupé': 'returning',
  'Retour à retirer': 'returning',
  'Retour vers vendeur': 'returning',
  'Retourné au vendeur': 'returned',
  'En préparation': 'pending',
  'Prêt à expédier': 'pending',
  'En attente': 'pending',
  'Enlevé': 'picked_up',
  "Reçu à l'agence": "in_transit",
  'Transféré': 'in_transit',
  'En cours de livraison': 'out_for_delivery',
  'En attente du client': 'out_for_delivery',
  'Livré': 'delivered',
  'Tentative échouée': 'failed_delivery',
  'Absent': 'failed_delivery',
  'Reporté': 'failed_delivery',
  'Refusé': 'failed_delivery',
  'En retour': 'returning',
  'Retourné': 'returned',
  'Annulé': 'cancelled',
  'Stop desk': 'ready_for_pickup',
  'Disponible en agence': 'ready_for_pickup',
  'Perdu': 'exception',
  'Endommagé': 'exception',
};

async function trackYalidine(
  credentials: Record<string, string>,
  trackingNumber: string,
): Promise<TrackingResult> {
  const base = (
    process.env['YALIDINE_API_BASE'] || 'https://api.yalidine.app/v1'
  ).replace(/\/$/, '');

  if (trackingNumber.startsWith('SANDBOX-')) {
    return {
      tracking_number: trackingNumber,
      status: 'in_transit',
      raw_status: 'Sandbox',
      event_key: `sandbox:${trackingNumber}`,
      event_at: new Date().toISOString(),
      provider_request_id: null,
      raw: {
        sandbox: true,
        tracking_number: trackingNumber,
        status: 'in_transit',
      },
    };
  }

  const apiId = String(credentials['apiId'] || '');
  const apiToken = String(credentials['apiToken'] || '');

  if (!apiId || !apiToken) {
    throw new Error('yalidine_tracking_credentials_missing');
  }

  const response = await fetch(
    `${base}/parcels/${encodeURIComponent(trackingNumber)}`,
    {
      headers: {
        'X-API-ID': apiId,
        'X-API-TOKEN': apiToken,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(25000),
    },
  );

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`yalidine_tracking_http_${response.status}`);
  }

  const raw = body?.data?.[0] ?? body?.data ?? body;

  if (!raw || typeof raw !== 'object') {
    throw new Error('yalidine_tracking_empty_response');
  }

  const rawStatus = String(
    raw.last_status ?? raw.status ?? '',
  ).trim();

  if (!rawStatus) {
    throw new Error('yalidine_tracking_status_missing');
  }

  const tracking = String(
    raw.tracking ?? raw.order_id ?? raw.id ?? trackingNumber,
  );

  const eventAtRaw =
    raw.date_last_status ??
    raw.last_update ??
    raw.date_creation ??
    raw.date ??
    null;

  const eventAt = eventAtRaw ? String(eventAtRaw) : null;

  return {
    tracking_number: tracking,
    status: YALIDINE_STATUS_MAP[rawStatus] || rawStatus,
    raw_status: rawStatus,
    event_key: eventAt
      ? `yalidine:${rawStatus}:${eventAt}`
      : `yalidine:${rawStatus}`,
    event_at: eventAt,
    provider_request_id: null,
    raw,
  };
}

export async function trackShipment(
  provider: TrackingProvider,
  encryptedCredentials: string,
  trackingNumber: string,
): Promise<TrackingResult> {
  const credentials = decryptCredentials(encryptedCredentials);

  switch (provider) {
    case 'yalidine':
      return trackYalidine(credentials, trackingNumber);
    case 'zr_express':
    case 'maystro':
    case 'noest':
    case 'dhd':
      throw new Error(`tracking_contract_not_verified:${provider}`);
    default:
      throw new Error(`unsupported_tracking_provider:${provider}`);
  }
}
