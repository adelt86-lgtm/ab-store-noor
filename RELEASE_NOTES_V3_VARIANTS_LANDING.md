# Dzair Store V3 — Variants, real landing stats, visit quality and checkout hardening

This build is based on `ab-store-noor-main (13).zip`.

## Included

### Product Variants
- Store-level ON/OFF switch for the variant system.
- Per-product variants with color, Taille, Pointure, price, stock and active state.
- Variant IDs are preserved when products are saved so historical orders remain linked to the original variant.
- Storefront variant selection before adding a variant product to cart.
- Variant price and stock shown to the customer.
- Out-of-stock variants are blocked on the storefront.
- Cart lines carry variant ID and attribute snapshots.
- Orders save variant ID plus color, Taille and Pointure snapshots.
- Dashboard order data can use the same variant information returned by the order RPC.
- WhatsApp order text includes variant attributes.
- Variant stock is deducted atomically by the server.
- Cancelling an order restocks the exact variant.
- Legacy products without variants keep their existing product-level price/stock behavior.

### Checkout / security
- Browser order creation now goes through `/api/create-order`.
- Turnstile token is sent to the server endpoint.
- The endpoint calls the protected `create_cart_order` RPC with `service_role`.
- Client-supplied prices remain non-authoritative.
- Merchant Purchase event remains after successful order creation.

### Store visits
- Store owner visits are excluded from the store visit counter.
- Super Admin visits are excluded.
- Anonymous/external/customer visits continue to count.
- The exclusion is enforced inside the database RPC, not only in the UI.

### Landing Page
- Messaging is merchant-focused: Facebook/Instagram/WhatsApp selling → store → checkout → order → WhatsApp → dashboard.
- Problem/solution/how-it-works sections now describe the actual merchant workflow.
- Features describe real platform capabilities.
- Landing statistics use real platform statistics; no hardcoded fallback numbers are shown.
- FAQ expanded to cover free plan, store link, orders, stock, variants, WhatsApp, attribution and Pro plans.
- Existing Super Admin statistics control remains available; the supplied production migration sets the default to real numbers.
- Unverified consumer-style claims such as fake ratings, fake customer counts and guaranteed delivery times are no longer used as the landing trust strip.

### French dashboard pass
- The touched Store Identity, Branding, Delivery, Shipping Integrations and Variant UI strings now have French alternatives.
- Variant editor labels are bilingual.

## SQL files to apply

If the older migrations have already been applied to the production Supabase project, apply these new files in this order:

1. `VARIANTS_V3_MIGRATION.sql`
2. `STORE_VISITS_OWNER_EXCLUSION.sql`
3. `PLATFORM_STATS_DEMO_MIGRATION.sql`

`PLATFORM_STATS_DEMO_MIGRATION.sql` is idempotent and also sets the platform statistics mode to real numbers (`demo_mode = false`).

Before production use, take the normal Supabase backup/snapshot and run the SQL in the Supabase SQL Editor.

## Important environment variables

The checkout API expects the existing production CAPTCHA setup:

- `VITE_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL` (or `VITE_SUPABASE_URL`)
- `APP_ORIGIN`

Never put `SUPABASE_SERVICE_ROLE_KEY` in client-side Vite variables.

## Verification

- Source syntax was checked with the available global TypeScript compiler after changes.
- A full Vite build could not be completed in the assistant environment because the uploaded project dependencies were not fully installed; the attempted `npm ci` timed out and `vite` was unavailable locally.
- Run `npm ci` (if needed) and `npm run build` in the project on Termux before committing/pushing.
