# Dzair Store V3.2 — Shipping Engine

## What changed
- Provider-neutral shipping engine for Yalidine, ZR Express, Maystro, NOEST and DHD.
- Carrier credentials are encrypted server-side with AES-256-GCM and never returned to the browser.
- GET connection state returns only `hasCredentials`, never masked secrets.
- Added `shipping_shipments` and `shipping_tracking_events` for idempotency and shipment history.
- Shipment creation uses an idempotency key and refuses duplicate orders.
- NOEST creation is followed by validation so a draft is not mistaken for a dispatched parcel.
- DHD is implemented as an EcoTrack tenant using a single Bearer token.
- ZR legacy Procolis is supported; ZR new platform is detected and currently reports that territory synchronization is required before creation.
- Maystro connection testing is supported. Shipment creation intentionally requires the Maystro catalogue/commune mapping step before allowing a live order.

## Required Vercel server environment
`SHIPPING_CREDENTIALS_KEY` — 32 random bytes encoded as base64. Example:

```bash
openssl rand -base64 32
```

Also set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and `APP_ORIGIN`.

## Supabase
Run `SHIPPING_ENGINE_V3_2.sql` after the existing project schema. Existing V3.1 plaintext `credentials` are cleared so they cannot remain as an application credential store; affected carriers must be reconnected.

## Provider notes
The implementation follows current publicly documented provider behavior where available. Yalidine uses `X-API-ID` + `X-API-TOKEN`; ZR legacy uses Procolis `token` + `key`; Maystro uses `Authorization: Token`; NOEST uses Bearer token plus User GUID on write operations; DHD uses EcoTrack Bearer token. Provider APIs can change independently, so live merchant credentials must be tested before production use.
