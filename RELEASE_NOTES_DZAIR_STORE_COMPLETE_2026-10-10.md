# Dzair Store — Consolidated update package

Date: 2026-10-10

This release package consolidates the current project tree and the updates discussed for the Dzair Store pilot. Existing shipping/carrier integration files and deployment configuration are retained.

## Included in the source tree

- Bilingual Arabic/French privacy and terms pages and localization work already present in the project.
- Storefront cart and product-variant flows, including size dropdowns (`XS`, `S`, `M`, `L`, `XL`, `XXL`, `3XL`), shoe sizes 35–46, and `Personnalisé / مخصص` custom values.
- Featured product and product-card add-to-cart controls, variant selection before adding variant products, cart quantity/removal and checkout flow.
- Storefront branding and landing-page styling already present in the project, including responsive layouts.
- Dashboard logout control and existing store-management tools.
- Per-store Meta Pixel ID field in the dashboard, persistence to `stores.meta_pixel_id`, and merchant storefront pixel initialization. The database must already have the `meta_pixel_id` column; the project includes setup documentation and the current query expects that field.
- Marketing/analytics dashboard views for orders, confirmed sales, deliveries, stock, product performance and campaign/source summaries. Analytics that depend on Supabase RPCs or migrations require those database objects to exist.
- Product Radar exploratory calculator. Its example products, demand and competition scores are illustrative/manual inputs; it is **not** connected to a live trend data provider.
- Wholesale directory in Arabic/French with **43 entries** from the public directory reviewed on 2026-10-10, representing **9 categories**, supplier search, category filtering, localStorage favorites, Telegram links where the source provides them, and a source/safety disclaimer. One source entry (`Tony Phone`) has no direct Telegram URL in the source and links back to the source directory instead. Member counts are snapshots and may change; suppliers are not verified or endorsed by Dzair Store.
- Responsive styles for the wholesale directory and Product Radar.
- Existing shipping integrations, shipping tracking/API files, Vercel configuration, SQL migrations, and project documentation are retained.

## Validation performed for this package

- TypeScript transpile/syntax checks passed for `WholesaleDirectory.tsx`, `dashboard.tsx`, `index.tsx`, `LandingPage.tsx`, and `ProductRadar.tsx`.
- Wholesale data check: 43 unique entries, 42 unique direct Telegram URLs, 9 category labels.
- CSS brace balance checked for the appended stylesheet rules.
- ZIP integrity is checked when the package is generated.

## Validation not completed

A full Vite production build and live Supabase/Vercel smoke test have **not** been completed in this environment because the local `node_modules/.bin/vite` executable is missing. Do not treat the package as build-verified or deployed until dependencies are installed and `npm run build`, database migration checks, and storefront/dashboard smoke tests pass.

## Source directory

https://ilyesderradji.com/telegram_channels/
