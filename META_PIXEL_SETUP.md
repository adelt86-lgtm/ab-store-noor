# Meta Pixel — Dzair Store V2.6

The storefront/landing code supports Meta Pixel without hard-coding the Pixel ID.

## Environment variable

Set this variable in the deployment environment (Vercel or `.env.local`):

```env
VITE_META_PIXEL_ID=YOUR_PIXEL_ID
```

The Pixel ID is public client-side configuration; do not put a Meta access token in the frontend.

## Events included

- Landing load → `PageView` + `ViewContent`
- Landing CTA clicks → `Lead`
- Merchant signup → `CompleteRegistration`

## Platform analytics

Public landing statistics come from Supabase, not from Meta Pixel. Run:

`PLATFORM_ANALYTICS_MIGRATION.sql`

It adds privacy-preserving platform visit counting plus public aggregate stats (published stores, new stores in the last 30 days, active products, platform visits, and store visits). No visitor name, phone, email or IP is stored.

## Recommended next step

For serious ad optimization, add Meta Conversions API server-side later for high-value events such as store creation and first order. Keep the browser Pixel for page and interaction signals.
