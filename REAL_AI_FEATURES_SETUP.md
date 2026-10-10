# Dzair Store — Real AI services setup

This release replaces the Product Radar demo cards with a server-backed data flow and adds a real Groq-backed merchant Copilot.

## 1. Apply the database migration first

In Supabase → SQL Editor, run the full file:

`STORE_APPEARANCE_AND_DIGITAL_PRODUCTS_MIGRATION.sql`

It adds per-store appearance preferences and digital-product metadata. Do not deploy the UI before applying it: the store and product queries use these fields.

## 2. Set Vercel environment variables

Set these for the Production environment (and Preview if you test previews):

- `GROQ_API_KEY` — secret API key from Groq.
- `GROQ_MODEL` — `openai/gpt-oss-20b`.
- `SUPABASE_URL` — existing server-side Supabase URL.
- `SUPABASE_ANON_KEY` — existing server-side anon key.
- `SUPABASE_SERVICE_ROLE_KEY` — existing server-side service-role key used by server APIs; never expose it to the browser.

The browser only sends the logged-in user's Supabase access token to the same-origin API routes. Groq and service-role credentials are server-only. Do not use a `VITE_` prefix for secrets.

## 3. Product Radar behavior and limits

- `api/product-radar.ts` fetches the current Google Trends RSS feed for Algeria (`geo=DZ`) at request time.
- The UI displays the actual source terms, source URLs, and collection timestamp. If the source is unavailable, the Radar shows an error instead of sample data.
- Groq can propose product hypotheses only when `GROQ_API_KEY` is configured. Every suggestion must cite an exact trend title from the fetched feed; unsupported suggestions are discarded.
- Google Trends signals are search trends, not proof of sales, conversion, demand, or profitability. The calculator uses only the costs the merchant enters; it does not pretend to measure market demand.
- Google can change or throttle its RSS endpoint. If that happens, the Radar fails visibly rather than fabricating results.

## 4. Dzair Copilot

The Copilot is available in the merchant dashboard. The API validates the session, checks that the authenticated user owns the requested store, and sends a limited snapshot of that store's products and recent orders to Groq. It is advisory only; it does not mutate store data.

## 5. Store themes and dark mode

Each store can choose Classic, Fashion, Beauty, or Modern, plus Light, Dark, or System mode. The choice is stored on the `stores` row and affects its public storefront.

## 6. Digital products — important limitation

The editor supports classifying products as physical or digital and storing merchant-only manual-delivery instructions. A digital product opens a WhatsApp request rather than pretending a COD shipping flow is a digital-payment flow. **Automatic, secure file delivery is not enabled in this release** because it requires a verified online-payment provider/webhook and private-file delivery controls. Never put private file URLs in the merchant instruction field. Do not market this as automatic digital fulfillment until payment verification and protected downloads are implemented and tested.

## Verification status

TypeScript/TSX syntax transpilation was checked for the modified files. A full Vite production build could not be run in this environment because dependencies could not be installed (`vite` is absent in the supplied runtime). Live API calls also require the Vercel/Supabase/Groq environment variables and were not testable here. Therefore, deploy to a Preview environment and verify login, source retrieval, Groq response, store-theme save, and product save before production launch.
