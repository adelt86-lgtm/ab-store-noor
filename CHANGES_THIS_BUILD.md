# ما تغيّر في هذه الحزمة

## أمان
- `src/lib/safeUrl.ts` جديد: يقبل روابط التواصل `https` من نطاقات المنصة فقط، وروابط التتبع `https` فقط.
- `index.tsx` و`storeData.ts` (حفظ وتحميل) و`OrdersPanel.tsx`: كلها تمر عبر التحقق (إغلاق ثغرة `javascript:`).
- `api/telegram-subscription.ts`: هروب HTML، ولا يُرسل رمز السحب، وأخطاء عامة.
- `api/ship-order.ts` و`api/shipping-connection.ts`: لا يعملان بدون `SUPABASE_SERVICE_ROLE_KEY`.
- حُذف `api/shipping-tracking-engine.backup.ts`.
- `SECURITY_FIXES_V2_3.sql`: يغلق جداول الشحن، ويخفي توكن Yalidine، ويحمي `plan`، وحد معدل للطلبات، ويمسح رمز السحب بعد المراجعة.
- `vercel.json`: ترويسات أمان + `noindex` للوحة والإدارة وصفحات الدخول.
- `.gitignore`: يتجاهل `.env` ويُبقي `.env.example`.

## ألوان
- هوية خضراء واحدة بدل أربع هويات، وكتلة توكنات واحدة في آخر `src/styles.css`.
- حُذفت ~887 قاعدة CSS لا يستعملها أي مكوّن (5468 → ~4340 سطراً).
- أزرار أبيض على `#0b6b43` (6.5:1)، وواتساب `#0c7f3f` (5.1:1)، وبانر Pro بتعريف واحد، وشارات حالة بتباين ≥ 4.5.

## SEO
- `public/robots.txt` (يمنع المسارات الخاصة ويشير للخريطة) و`public/sitemap.xml` ثابت.
- وسم `noindex` داخل مسارات dashboard وsuper-admin وauth/callback.

## لم أغيّره
- نظام اللغة (استعملتُ نسختك `i18n-fix-language-final` كما هي).
- لم أستطع تشغيل `vite build` هنا: فحصتُ الصياغة بـ `tsc` فقط، فشغّل `npm run build` قبل النشر.
