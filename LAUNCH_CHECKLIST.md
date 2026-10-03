# Dzair Store — قائمة الإطلاق (اقرأها بالترتيب)

## 1) قاعدة البيانات (Supabase → SQL Editor)
شغّل `SECURITY_FIXES_V2_3.sql` **أخيراً** بعد كل ملفات SQL الأخرى، ثم نفّذ استعلامات التحقق في آخره.
- بعد التشغيل لا يقرأ المتصفح عمود `yalidine_api_token` ولا جداول الشحن.
- جرّب قبول اشتراك من لوحة الإدارة (هناك trigger يحمي `plan`).
- ملاحظة: أي عمود جديد في `stores` يحتاج `GRANT SELECT (col) ON public.stores TO anon, authenticated;`

## 2) متغيرات Vercel (Settings → Environment Variables)
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (إلزامي الآن), `SHIPPING_CREDENTIALS_KEY`, `APP_ORIGIN=https://www.dzairstore.online`, و`TELEGRAM_*` إن استعملته.

## 3) النطاق
- اجعل `www.dzairstore.online` هو الأساسي وحوّل `dzairstore.online` إليه (301).
- أضف النطاق إلى Google Search Console وأرسل `sitemap.xml`.

## 4) اختبار يدوي قبل الفتح للعامة (20 دقيقة)
1. تسجيل تاجر جديد ← إضافة منتج ← نشر المتجر.
2. من هاتف آخر: افتح المتجر ← اطلب ← تأكد من وصول الطلب للوحة وواتساب.
3. غيّر حالة الطلب ← اطبعه ← صدّر CSV.
4. بدّل اللغة (عربي/فرنسي) في الهبوط والمتجر واللوحة.
5. اكتب رابط تواصل غير صالح (مثل `javascript:alert(1)`) ← يجب أن يُرفض.
6. جرّب شحنة حقيقية بحساب شركة توصيل واحدة على الأقل.

## 5) ما لم يُنجز بعد (لا يمنع إطلاقاً تجريبياً)
- CAPTCHA على صفحة الطلب (Cloudflare Turnstile).
- سياسات Storage لـ `product-images` و`payment-receipts` (راجعها في لوحة Supabase).
- نسخ احتياطي مفعّل ومراقبة أخطاء (Sentry).
- صفحة شروط الاستخدام وسياسة الخصوصية.
- نقل المتاجر إلى نطاقات فرعية (`slug.dzairstore.online`).
- `og:image` (1200×630) و`canonical` لكل صفحة، وSSR/prerender لصفحة الهبوط.
