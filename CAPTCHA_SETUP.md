# إعداد CAPTCHA (Cloudflare Turnstile) — مجاني

## 1) أنشئ الموقع في Cloudflare
1. dash.cloudflare.com ← Turnstile ← **Add site**.
2. Domain: `dzairstore.online` (يشمل www). Widget mode: **Managed**.
3. انسخ **Site Key** و**Secret Key**.

## 2) أضف المتغيرات في Vercel (Settings ← Environment Variables، Production)
- `VITE_TURNSTILE_SITE_KEY` = Site Key (متغير عام، يحتاج إعادة نشر)
- `TURNSTILE_SECRET_KEY` = Secret Key (نوع **Secret**)

(للتجربة فقط يمنحك Cloudflare مفاتيح اختبار: Site `1x00000000000000000000AA` / Secret `1x0000000000000000000000000000000AA`، وكلها تمرّ دائماً.)

## 3) انشر الكود ثم اختبر طلباً من المتجر
يجب أن يظهر مربع التحقق أعلى زر الإرسال، والزر معطّل حتى يكتمل التحقق.

## 4) أغلق الاستدعاء المباشر (بعد نجاح الطلب التجريبي)
شغّل `CAPTCHA_ENFORCE_V2_4.sql` في Supabase. بدونه يبقى بإمكان من يملك مفتاح الـanon تجاوز الصفحة واستدعاء الدالة مباشرة.

## ملاحظات
- إن لم يُضبط `TURNSTILE_SECRET_KEY` فإن الـAPI يسمح بالطلبات (ويسجّل تحذيراً) حتى لا يتوقف البيع أثناء الإعداد.
- بعد تشغيل SQL: إن فشلت الطلبات، استعمل سطر ROLLBACK في آخر الملف.
