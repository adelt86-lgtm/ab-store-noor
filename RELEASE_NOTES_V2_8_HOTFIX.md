# Dzair Store V2.8 — Storefront & Dashboard Hotfix

## Fixes
- Fixed storefront hero product image being hidden behind its frame due to a negative z-index.
- Reduced the hero image overlay so real product photography is not washed out.
- Removed the remaining italic/editorial brand typography. Storefront merchant names now use the same unified Cairo-based UI typography.
- Mobile dashboard navigation now exposes all sections, including Social Channels, instead of forcing seven items into a five-column grid.
- Added a Social Channels quick action to the dashboard overview.
- Added resilient image fallbacks in Products, Media Library and Product Editor when an image URL is missing/broken.
- Increased contrast of order details so operational information does not appear faded on the white dashboard.

## Social links
The social links feature still requires `SOCIAL_LINKS_MIGRATION_V2_7.sql` to be run once in Supabase. This adds the `url` column and public policy needed for Facebook, Instagram, Telegram and TikTok links.
