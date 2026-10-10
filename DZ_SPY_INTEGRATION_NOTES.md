# DZ SPY integration — merchant dashboard

This build integrates the DZ SPY experience into the existing Dzair Store merchant dashboard under the sidebar item “DZ SPY · ذكاء السوق / DZ SPY · Intelligence marché”. It replaces the prior Product Radar view while keeping the authenticated `/api/product-radar` endpoint.

## Included in this build
- DZ SPY branded overview inside the merchant dashboard.
- Arabic/French labels following the existing dashboard language.
- Mobile-first in-component bottom navigation: Home, Discover, Ads, Saved, Profile.
- Search and filter sheet, trend list, product-opportunity detail sheet, save/unsave, and profit calculator.
- Public-source links and explicit disclaimers that search trends are not sales proof.
- Ad intelligence screen intentionally shows a clear “source not connected” state instead of fabricated ad data.

## Important
The existing Google Trends + optional Groq API powers trend signals and cautious product hypotheses. Public Meta/TikTok ad feeds are not connected by this patch; do not advertise live ad tracking until official/authorized sources are integrated.

## Install
Unzip the project, review the changed `src/components/ProductRadar.tsx`, `src/styles.css`, and `src/routes/dashboard.tsx`, then run `npm ci` and `npm run build`. Apply through the project's normal Git workflow after reviewing the diff.
