# Dzair Store — V2.2 Engineering & UX Audit

## What was improved
- Reworked the merchant dashboard visual layer into a cleaner SaaS system: lighter workspace, stronger hierarchy, softer cards, clearer states, responsive mobile navigation, and more deliberate primary actions.
- Kept the editorial/Arabic character of the public storefront while modernizing product cards and interactions.
- Added a real address field to checkout and included it in the stored order and WhatsApp message.
- Order creation is now atomic through `create_cart_order`.
- Product names/prices are resolved from the database during order creation; browser prices are not authoritative.
- Shipping is recalculated server-side from the store's delivery configuration / Algeria zone rates.
- Stock is checked and decremented atomically for products with stock tracking.
- Free plan limits are enforced in PostgreSQL: 5 active products and 30 orders per calendar month.
- Order status changes and deletion use owner-checked RPCs rather than broad client-side mutations.
- Yalidine credentials are no longer selected by normal application queries; the shipping endpoint retrieves them through an owner-checked RPC.
- Added missing schema pieces referenced by the source: store delivery/stock/shipping fields, product variants, store channels, subscription requests, and visit counter.
- Added client-side image size/type validation (5 MB maximum).

## Important deployment order
1. Existing/base Supabase schema.
2. `ORDERS_MIGRATION.sql`
3. `ORDER_ITEMS_MIGRATION.sql`
4. `FREEMIUM_PLANS_MIGRATION.sql` if not already applied.
5. `SUBSCRIPTION_PLAN_SELECTION_MIGRATION.sql`
6. `SUPABASE_SUPER_ADMIN.sql`
7. `SCHEMA_GAPS_V2_2.sql`
8. `HARDENING_V2_2.sql`

If a production database already has equivalent objects, review each `CREATE POLICY`, `REVOKE`, and function before applying migrations.

## Risks still requiring production configuration
- Supabase Storage buckets and their `storage.objects` policies are environment configuration and are not fully defined by the source bundle. Verify `product-images` and the private `payment-receipts` bucket before accepting uploads.
- Payment cardless/GAB codes are currently stored for administrative verification. Treat this as sensitive financial data and restrict access/retention; ideally migrate to a safer verification workflow rather than retaining raw codes indefinitely.
- The current checkout shipping rules are platform defaults. If carrier tariffs change, update both the application reference table and the server-side RPC in the same release.
- The automated build could not be completed in this review environment because the uploaded project contains `bun.lock` but no npm lockfile, and dependency installation timed out. TypeScript source files changed in this pass were parsed successfully with the TypeScript compiler API, but a full `vite build` should still be run in CI/Vercel before deployment.

## Product/UX direction
The strongest direction for the product is not to make every screen visually complex. The polished feel should come from:
- consistent spacing,
- one primary CTA per surface,
- predictable status colors,
- fewer competing borders,
- clear empty/loading/error states,
- fast mobile interactions,
- and a visual system shared by landing page, dashboard, checkout, and storefront.
