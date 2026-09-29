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

export async function trackShipment(
  provider: TrackingProvider,
  encryptedCredentials: string,
  trackingNumber: string,
): Promise<TrackingResult> {
  const credentials = decryptCredentials(encryptedCredentials);

  switch (provider) {
    case 'yalidine':
    case 'zr_express':
    case 'maystro':
    case 'noest':
    case 'dhd':
      throw new Error(`tracking_contract_not_verified:${provider}`);
    default:
      throw new Error(`unsupported_tracking_provider:${provider}`);
  }
}
