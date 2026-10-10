# Dzair Store — Real services update (2026-10-10)

## Included
- Replaced the demo-only Product Radar with an authenticated server endpoint that reads the Google Trends RSS feed for Algeria and shows source terms, links, and a retrieval timestamp. Source failures are shown as errors; demo trend cards are not substituted.
- Added Groq-based product opportunity hypotheses grounded in exact live trend titles. No invented demand, competition, sales, or profitability metrics are displayed.
- Added Dzair Copilot to the merchant dashboard. Its server endpoint validates the Supabase session and checks store ownership before sending a bounded snapshot of products and recent orders to Groq.
- Added four per-store storefront themes (Classic, Fashion, Beauty, Modern) and Light/Dark/System display modes.
- Added a Digital Products dashboard section, product-type metadata, and WhatsApp-based manual delivery requests. Automatic file delivery is deliberately not claimed or enabled without verified online payment and private-file controls.
- Added `STORE_APPEARANCE_AND_DIGITAL_PRODUCTS_MIGRATION.sql` and `REAL_AI_FEATURES_SETUP.md`.

## Required before use
1. Run `STORE_APPEARANCE_AND_DIGITAL_PRODUCTS_MIGRATION.sql` in Supabase SQL Editor.
2. Configure `GROQ_API_KEY` and `GROQ_MODEL=openai/gpt-oss-20b` in Vercel. The server must also have Supabase URL/anon key; the Copilot can use `SUPABASE_SERVICE_ROLE_KEY` if configured.
3. Deploy to Vercel Preview and test while logged in before Production.

## Test report
- TypeScript/TSX syntax transpilation: passed for all modified TypeScript files.
- Full production build: not run successfully in the provided environment because `vite` was not installed and `npm ci` could not complete before timeout.
- Live Google Trends/Groq/Supabase requests: not testable in this offline runtime without the deployment credentials. Do not interpret this ZIP as proof that external APIs have already been exercised in production.
