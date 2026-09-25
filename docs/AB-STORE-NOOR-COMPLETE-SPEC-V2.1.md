# AB Store Noor — التوثيق الكامل الموحد V2.1
### متاجر النور - المنصة الجزائرية المصغّرة

> **متجرك الجزائري في دقائق: رابط، سلة، طلبات، واتساب — بدون عمولة على المبيعات.**

| المعلومة | القيمة |
| :--- | :--- |
| **اسم المشروع** | AB Store Noor (متاجر النور) |
| **النوع** | منصة SaaS مصغّرة لإنشاء متاجر إلكترونية جزائرية |
| **السوق** | الجزائر - COD - واتساب - 58 ولاية - دينار جزائري |
| **الجمهور** | التجار الصغار، أصحاب المحلات، بائعو انستغرام/فيسبوك، المطاعم البسيطة |
| **المستودع الرئيسي** | `adelt86-lgtm/ab-store-noor` |
| **الإصدار** | V2.1 - سبتمبر 2026 |
| **الحالة** | ~70% جاهز للـ Pilot |

---

## جدول المحتويات
1. الملخص التنفيذي
2. الرؤية والتموضع
3. المكدس التقني الكامل
4. هيكل المستودع
5. هيكل الميزات التفصيلي
6. نموذج التسعير الرسمي V2.1
7. ميزة الشحن Pro Shipping بالتفصيل الدقيق
8. دليل الاستعانة بـ AB Sales كمحرك خلفي
9. قاعدة البيانات بالتفصيل الدقيق
10. التصميم والواجهة
11. المنافسون والتميّز
12. العلاقة مع DZ Sales Agent
13. خارطة الطريق ونطاق الإصدارات
14. تقدير الجاهزية
15. خطة عمل 14 يوم بالتفصيل
16. الأمن والحماية
17. التثبيت والتشغيل
18. قوائم التحقق والأخطاء الشائعة
19. مصطلحات سريعة
20. الخلاصة والقواعد الذهبية

---

## 1. الملخص التنفيذي
AB Store Noor منصة تتيح للتاجر الجزائري إنشاء متجر إلكتروني جاهز في دقائق، مشاركة رابط أو QR، استقبال طلبات بالدفع عند الاستلام COD، ومتابعة الطلبات من لوحة تحكم بدون عمولة على المبيعات.
المشكلة: التاجر على انستغرام يضيع وقته في "ابعثلي في الخاص" بدون رابط طلب واضح.
الحل: رابط واحد `/?store=slug` + سلة + طلب متعدد المنتجات + واتساب مباشر + لوحة طلبات + QR للمحل.
الاستراتيجية: AB Store هو منتج الاكتساب البسيط، و DZ Sales Engine هو المحرك الخلفي للشحن والذكاء الاصطناعي الذي يُباع كترقية Pro Shipping فقط عند الحاجة.

## 2. الرؤية والتموضع
**الجملة التعريفية:** أسهل طريق من ستوري انستغرام إلى طلب مؤكّد على واتساب.
**المسار الاستراتيجي:**
- البداية: فكرة وكالة (متجر في 24 ساعة)
- الآن V2: منصة مصغّرة (عدة تجار + Free/Pro/Pro Shipping + لوحة)
- المستقبل: نظام بيئي (AB Store للاكتساب + DZ Sales Agent للأتمتة)
**ماذا لسنا:** لسنا وكالة يدوية، لسنا Shopify معقد، لسنا منصة 102 شركة شحن في v1، لسنا بعمولة.
**ماذا نحن:** واتساب-First + QR للمحل الحي والمطعم + منصة جزائرية بسيطة وسريعة.

## 3. المكدس التقني الكامل
| الطبقة | التقنية | ملاحظات |
| :--- | :--- | :--- |
| الواجهة | React 18 + TypeScript + Vite | SPA |
| التوجيه | TanStack Router | |
| الأنماط | Tailwind CSS + CSS مخصص | ثيم كريمي #FFF8E7 + كحلي #0F172A + ذهبي #C5A254 |
| الخلفية | Supabase (Auth + Postgres + Storage + RLS + Vault) | |
| حالة السلة | React useState + localStorage | إلزامي في v1 لمنع ضياع السلة عند التحديث |
| الطلبات | واتساب wa.me + OrderModal | |
| محرك الشحن | DZ Sales Engine عبر API داخلي | لا كود شحن مكرر في Store |
| النشر | Vercel + Supabase Cloud | |
**المستودعات ذات الصلة:**
- `ab-store-noor`: المنتج الأساسي Storefront + Landing + Dashboard
- `Ab-sales-page`: صفحة تسويق قديمة (مرجع فقط)
- `dz-sales-agent`: المحرك الخلفي (وكيل مبيعات + شحن + Evolution)

## 4. هيكل المستودع
```
ab-store-noor/
├── src/routes/ (landing, store, dashboard)
├── src/components/ (Storefront, OrderModal, Cart, QR)
├── src/hooks/useCart.ts (مع localStorage)
├── src/lib/supabase.ts
├── supabase/ORDERS_MIGRATION.sql
├── supabase/ORDER_ITEMS_MIGRATION.sql
├── docs/AB-SALES-INTEGRATION-GUIDE.md
├── .env.example
└── README.md
```

## 5. هيكل الميزات التفصيلي
**5.1 صفحة الهبوط:** تسويق عربي RTL، شرح الخطط الثلاث، CTA للتسجيل، تصميم دافئ غير آلي.
**5.2 واجهة المتجر Storefront `/?store=slug`:**
- شريط إعلان قابل للتعديل، بانر المنصة (للمجاني فقط، يُخفى في Pro/Pro Shipping)، Hero، شبكة منتجات
- أزرار المنتج المعتمدة: [أيقونة السلة] + [اطلب الآن] + [أيقونة واتساب] منفصلة
- سلة جانبية Drawer + حساب المجموع + الشحن
- إتمام الطلب عبر OrderModal (الاسم، الهاتف، الولاية، البلدية، العنوان، نوع التوصيل منزل/مكتب)
- QR برابط مطلق كامل `window.location.origin + "/?store=" + slug` + زر نسخ الرابط + تحميل صورة QR
- حالة المتجر مفتوح/مغلق Rideau + ساعات العمل
**5.3 لوحة التاجر Dashboard:**
- نظرة عامة، إدارة المتجر (اسم، وصف، واتساب، شريط إعلان، فتح/إغلاق، ساعات، لوجو في Pro فقط)
- المنتجات: إضافة/تعديل/حذف (اسم، سعر، صورة Storage، وصف، متاح)
- الطلبات: جدول حالات (new/confirmed/shipped/done/cancelled) + تفاصيل كل طلب (منتجات، كميات، سعر كل منتج، شحن، إجمالي) + واتساب للزبون + تصدير + زر الشحن (Pro Shipping فقط)
- QR + إعدادات التوصيل (58 ولاية + سعر منزل/مكتب) + إعدادات الشحن (Pro Shipping)
- الترقية: رفع إثبات دفع + مراجعة يدوية
**5.4 سوبر أدمن:** مراجعة طلبات الاشتراك وموافقة/رفض وتفعيل الخطة.

## 6. نموذج التسعير الرسمي V2.1
| الميزة | Free | Pro | Pro Shipping |
| :--- | :--- | :--- | :--- |
| السعر الشهري | 0 دج دائم | 2,400 دج / شهر | 3,900 دج / شهر |
| السعر السنوي | - | 19,000 دج / سنة | 32,000 دج / سنة |
| المنتجات | حتى 10 | بلا حد (500) | بلا حد (500) |
| الطلبات / شهر | حتى 20 | بلا حد | بلا حد |
| شعار المنصة | ظاهر | يُزال | يُزال |
| لوجو التاجر | لا | نعم | نعم |
| دومين خاص | لا | لا (لاحقا) | نعم (أولوية) |
| رابط `?store=slug` | نعم | نعم | نعم |
| تصدير Excel/CSV | نعم | نعم | نعم |
| الشحن بضغطة زر Yalidine/ZR | لا | لا | نعم |
| تتبع + Bordereau | لا | لا | نعم |
| الدعم | أساسي | أولوية واتساب | أولوية قصوى |
**منطق التسعير:** Free للتجربة، Pro لإزالة الشعار (أقوى دافع نفسي)، Pro Shipping لتوفير كتابة العناوين. سعر 1,500 دج ألغي لأنه يوحي بمنتج رخيص.

## 7. ميزة الشحن Pro Shipping بالتفصيل الدقيق
**7.1 المبدأ:** لا نكرر كود الشحن. المنصة الثانية هي المحرك الوحيد.
```
[AB Store - لوحة التاجر] -- زر إرسال للشحن --> [API داخلي آمن] --> [DZ Sales Engine] --> Yalidine/ZR API
```
**7.2 مراحل الإطلاق:**
- المرحلة 1 - v1 الآن: زر تصدير Excel/CSV بصيغة Yalidine/ZR + زر نسخ عنوان الزبون (بدون API)
- المرحلة 2 - v1.5 بعد أول 10 عملاء Pro: إطلاق Pro Shipping (حقول API مشفرة + زر إنشاء طرد + حفظ tracking_number)
- المرحلة 3 - v2 لاحقا: تتبع مباشر للزبون + باقي الشركات
**7.3 حقول قاعدة البيانات:**
- في `stores`: `yalidine_api_id` TEXT ENCRYPTED, `yalidine_api_token` TEXT ENCRYPTED, `zr_api_token` TEXT ENCRYPTED, `shipping_enabled` BOOLEAN, `shipping_plan` TEXT
- في `orders`: `shipping_company` TEXT, `tracking_number` TEXT, `shipping_status` TEXT, `shipped_at` TIMESTAMPTZ, `label_url` TEXT
**تحذير:** لا تخزن المفاتيح كنص عادي، استخدم Supabase Vault ولا تظهرها كاملة بعد الحفظ.
**7.4 تسلسل الشحن:**
تاجر يضغط إرسال للشحن -> Store يتحقق plan==pro_shipping ومفاتيح موجودة ولم يُشحن من قبل -> POST /internal/v1/shipments مع Bearer ENGINE_INTERNAL_SECRET و Body ShipReadyOrder JSON -> Engine يستدعي Yalidine/ZR -> Response tracking_number -> Store UPDATE orders -> عرض رقم التتبع.
**7.5 سلوك الفشل:**
- المحرك لا يرد (Timeout 25ث): تعذّر الشحن الآن — صدّر CSV
- مفتاح خاطئ: مفتاح Yalidine غير صحيح — راجع الإعدادات
- الشركة رفضت العنوان: عرض رسالة الشركة، الطلب يبقى confirmed
- طلب سبق شحنه: منع الإرسال المكرر بـ order_id

## 8. دليل الاستعانة بـ AB Sales كمحرك خلفي
**المبدأ الحاكم:** AB Store = الوجه البسيط (اكتساب + متجر + طلبات)، AB Sales = المحرك الخلفي (واتساب، رد آلي، شحن).
| افعل | لا تفعل |
| :--- | :--- |
| Store يستدعي Sales عبر API داخلي | نسخ مجلدات Sales داخل Store |
| التاجر يرى Store فقط | إجبار التاجر على لوحتين |
| تفعيل حسب الخطة | تشغيل المحرك لكل Free |
| عزل الأعطال | ربط المتجر بعطل Evolution |
**ماذا نأخذ:** نموذج الطلبات، منطق الشحن، shippingService, تخزين مفاتيح API (v1.5) | **ماذا نترك في v1:** Meta OAuth كامل، Telegram، Shopify/YouCan، فوترة Paddle، واجهات Sales.
**المكونات:** Store API (مصدر الحقيقة) + Sales Engine API (Railway) + جسر POST /internal/v1/shipments محمي بـ secret + Vault.
**قواعد العزل:** 1) Store يعمل بدون Sales 2) Sales لا يكتب فوق كتالوج Store 3) ربط الهوية store_id UUID.
**مراحل الدمج:** 0) Store مستقل 100% لا استدعاء 1) توحيد المفاهيم (wilaya_code, delivery_type home/stopdesk, حالات new/confirmed/shipped/done/cancelled) 2) جسر الشحن v1.5 3) واتساب Evolution v2 (إشعار طلب جديد -> رسالة تأكيد -> رد آلي) 4) مزامنة كتالوج بدفع عند التعديل من Store -> Sales.
**عقد البيانات:**
```json
// Store -> Engine لإنشاء طرد
{
  "store_id": "uuid-v4",
  "order_id": "uuid-v4",
  "carrier": "yalidine",
  "customer": { "name": "أحمد", "phone": "0550123456", "wilaya_code": 16, "wilaya_name": "الجزائر", "commune": "باب الزوار", "address": "حي 500 مسكن", "delivery_type": "home" },
  "items": [{ "product_name": "حذاء", "quantity": 1, "unit_price": 4500 }],
  "cod_amount": 5500,
  "notes": "الاتصال قبل التوصيل"
}
// رد المحرك
{ "ok": true, "tracking_number": "YL-12345678", "carrier": "yalidine", "label_url": "https://..." }
// إشعار طلب جديد
{ "store_id": "uuid", "type": "new_order_notify", "order_id": "uuid", "summary": "طلب #1023 — 2 منتجات — 5500 دج — وهران" }
```

## 9. قاعدة البيانات بالتفصيل الدقيق
**stores:** id UUID PK, owner_id FK auth.users, slug UNIQUE, name, description, whatsapp, logo_url, is_open BOOLEAN, opening_hours JSONB, announcement_text, plan TEXT, shipping_price NUMERIC, shipping_enabled BOOLEAN, created_at
**products:** id UUID PK, store_id FK, name, price NUMERIC, image_url, description, is_available BOOLEAN, created_at
**orders:** id UUID PK, store_id FK, customer_name, customer_phone, wilaya_code INT 1-58, wilaya_name, commune, address, delivery_type home/stopdesk, shipping_price NUMERIC, total_amount NUMERIC, status TEXT, tracking_number, shipping_company, shipped_at, label_url, created_at
**order_items:** id UUID PK, order_id FK, product_id FK, product_name TEXT, quantity INT, unit_price NUMERIC, created_at
**subscription_requests:** id UUID PK, store_id FK, requested_plan TEXT, proof_image_url, status pending/approved/rejected
**ملفات SQL بالترتيب الإلزامي:** 1) ORDERS_MIGRATION.sql 2) ORDER_ITEMS_MIGRATION.sql (RPC لسلة متعددة). عدم تشغيل الثاني يكسر لوحة الطلبات.
**RLS:** التاجر يرى ويعدل خاصته فقط owner_id=auth.uid()، الزبون anon ينشئ orders+order_items فقط عبر RPC، السوبر أدمن يرى كل subscription_requests.

## 10. التصميم والواجهة
ألوان: كريمي #FFF8E7 خلفية، كحلي #0F172A عناوين، ذهبي #C5A254 لمسات CTA. إحساس بشري دافئ RTL خط Tajawal/Cairo. بطاقات مربعة + 3 أزرار منفصلة. سلة Drawer من اليمين مع localStorage. QR مربع أبيض نظيف.

## 11. المنافسون والتميّز
| الفئة | أمثلة | ملاحظة |
| :--- | :--- | :--- |
| SaaS محلية | DZBuild, DzStore, Mystoq, Arkan, Zimam | شحن API + 2500-3500 دج |
| واتساب | Watsy | قريب من Agent |
| وكالات | متجر في 24 ساعة | منافس اكتساب |
| عالمي | Shopify, WooCommerce | ضعيف محليا |
فجوة AB Store: تكاملات الشحن الكاملة، مكافحة الوهمي، بيكسل. فرصة AB Store: أبسط 10 مرات، واتساب-First، QR للمحل، سعر شفاف.

## 12. العلاقة مع DZ Sales Agent
| المنتج | الدور | التسعير |
| :--- | :--- | :--- |
| AB Store Noor | اكتساب التاجر المبتدئ | Free/Pro 2400 |
| DZ Sales Engine | محرك خلفي | لا يباع مباشرة |
| Pro Shipping | واجهة بيع الشحن داخل Store | 3900 |

## 13. خارطة الطريق ونطاق الإصدارات
**v1 إغلاق قبل Pilot:** تسجيل + رابط فوري، CRUD منتجات، سلة + COD + واتساب + localStorage، orders+order_items مع عرض مفصل، ولايات + منزل/مكتب، Rideau + QR مطلق، Free/Pro بالحدود الجديدة. رحلة القبول: تاجر يسجل بالهاتف -> يضيف منتجين -> يفتح الرابط -> زبون يطلب -> يظهر مفصلا -> تغيير الحالة -> واتساب -> تصدير CSV.
**v1.5 Pro Shipping:** Yalidine+ZR + Bordereau.
**مؤجل v2 ممنوع في v1:** مخزون متقدم، OTP كامل، إحصائيات وبيكسل، قوالب ودومين، تطبيق جوال، ربط Agent كامل، Meta OAuth.

## 14. تقدير الجاهزية
| البعد | التقدير |
| :--- | :--- |
| فكرة وملاءمة السوق | عالية جدا |
| Storefront | 80% |
| لوحة تاجر | 75% |
| حلقة order_items | 40% خطر أحمر |
| شحن ولايات | 50% |
| Pilot | ممكن بعد v1 |
| إطلاق عام | مبكر جدا |
الجاهزية: ~70% للـ Pilot، ~55% لإطلاق عام.

## 15. خطة عمل 14 يوم بالتفصيل
| الأيام | المهمة | المخرج |
| :--- | :--- | :--- |
| 1-3 | إصلاح SQL order_items وعرض التفاصيل + اختبار 10 طلبات وهمية | لوحة تعرض طلب متعدد صحيح |
| 4-5 | localStorage للسلة + تصدير CSV بصيغة Yalidine/ZR + نسخ عنوان | تصدير جاهز |
| 6-7 | تطبيق حدود Free/Pro الجديدة + QR برابط مطلق + بانر | تسعير فعال |
| 8-10 | اختبار مع 3 تجار حقيقيين (فيديو شاشة على الهاتف) | قائمة 10 مشاكل حقيقية |
| 11-14 | Pilot مغلق مع 10 بائعات انستغرام + جروب واتساب دعم | قرار Go/No-Go لـ v1.5 |

## 16. الأمن والحماية
ENGINE_INTERNAL_SECRET قوي في header، لا Service Role في المتصفح، مفاتيح الشحن في Vault مشفرة، RLS يمنع تاجر من شحن طلبات متجر آخر، لا تخزين توكنات في logs، timeout 25ث، منع إنشاء طرد مكرر بـ idempotency key = order_id، Evolution قد ينقطع لا تعتمد عليه وحده.

## 17. التثبيت والتشغيل
```bash
git clone https://github.com/adelt86-lgtm/ab-store-noor.git
cd ab-store-noor
npm install
cp .env.example .env
npm run dev
```
**.env:**
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
ENGINE_INTERNAL_SECRET=
```
تشغيل Migrations بالترتيب في Supabase SQL Editor.

## 18. قوائم التحقق والأخطاء الشائعة
**قبل استدعاء المحرك:** [ ] الطلب محفوظ مع بنود كاملة [ ] الخطة pro_shipping [ ] مفاتيح صحيحة [ ] wilaya/phone صحيحة [ ] ENGINE_INTERNAL_SECRET مضبوط [ ] timeout واضح [ ] منع تكرار.
**أخطاء يجب تجنبها:** 1) دمج المستودعين monorepo قبل الأوان 2) عرض لوحة Sales للتاجر 3) بناء شحن ثانٍ داخل Store 4) رد آلي قبل استقرار الطلب 5) مشروع Supabase واحد بصلاحيات مفتوحة 6) بيع Pro Shipping قبل أول طرد ناجح داخليا.

## 19. مصطلحات سريعة
Storefront: واجهة الزبون، Dashboard: لوحة التاجر، Rideau: شريط مغلق، COD: دفع عند الاستلام، Pro: مدفوعة، slug: معرف الرابط، order_items: أسطر الطلب، Pilot: إطلاق تجريبي، Vault: تخزين مشفر، Evolution: واتساب غير رسمي.

## 20. الخلاصة والقواعد الذهبية
AB Store مشروع منصة مصغّرة في منتصف الطريق بين متجر واتساب بسيط ومنصة COD كاملة. القيمة تتحقق عندما تكتمل حلقة: تسجيل -> منتجات -> رابط -> طلب متعدد -> لوحة واضحة -> واتساب.
**قواعد ذهبية:** لا ميزات جديدة بعد يوم 10، لا تكامل شحن قبل 10 عملاء Pro، لا إعادة تصميم شاملة، لا مطاردة 102 شركة شحن، لا بناء وكالة يدوية بجانب المنصة، Store يبيع البساطة و Sales يشتغل في الخلفية.
---
*هذا الملف هو المرجع الوحيد. أي ميزة خارج v1 تعتبر مؤجلة. حدّث هذا الملف عند كل إصدار.*
