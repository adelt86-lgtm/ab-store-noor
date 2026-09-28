# Dzair Store V2.6 — MASTERPIECE

## Landing page
- Live platform statistics from Supabase.
- Landing visits are recorded directly through a privacy-preserving RPC.
- CTA funnel hooks for Meta Pixel.
- Existing services/pricing/FAQ structure retained and refined.

## Storefront hero
- Featured product image, name, description and price are now one cohesive commercial unit.
- Product CTA sits directly with the featured offer.
- Mobile layout keeps the offer attached to the image instead of separating the image from the commercial information.
- Broken/missing hero images fall back to the bundled product image.
- Featured price/offer is no longer duplicated in a disconnected hero meta block.
- Removed duplicate product category label in product cards.

## Meta Pixel
- Optional via `VITE_META_PIXEL_ID`.
- `PageView`, `ViewContent`, `Lead`, and `CompleteRegistration` events are wired.
- No Meta access token is placed in frontend code.

## Database
- Added `PLATFORM_ANALYTICS_MIGRATION.sql` for public aggregate landing statistics and privacy-preserving visit counting.

## Validation
- Static source sanity checks passed.
- Full TypeScript/Vite build was not available in this environment because project dependencies (`vite/client`) are not installed locally.
