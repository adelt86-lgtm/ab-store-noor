# AB Store Noor — إصدار قابل للبيع (v1 core)

## ما تم في هذا التحديث

1. **ORDER_ITEMS_MIGRATION.sql** — جدول `order_items` + RLS + حقول تتبع الشحن على `orders`
2. **التسعير V2.1** — Free / Pro (2400) / Pro Shipping (3900) في `src/lib/pricing.ts`
3. **loadOrders** يجلب `order_items` مع كل طلب
4. **OrdersPanel** — تفاصيل المنتجات، تصدير CSV، نسخ العنوان، واتساب
5. **OrderModal** يرسل `unit_price` مع كل بند
6. **السلة** تُحفظ في `localStorage` حسب `storeId`
7. توسيع قيد الخطة ليشمل `pro_shipping`

## قبل التشغيل على الإنتاج

في Supabase SQL Editor بالترتيب:

1. `ORDERS_MIGRATION.sql` (إن لم يُنفَّذ)
2. `FREEMIUM_PLANS_MIGRATION.sql`
3. **`ORDER_ITEMS_MIGRATION.sql`** ← إلزامي لهذا الإصدار

## ما يبقى بعد v1 (حسب المواصفة)

- تطبيق حد 10 منتجات / 50 طلب في الواجهة بقوة
- Pro Shipping API (جسر DZ Sales) — v1.5
- عرض باقة Pro Shipping كاملة في Landing (حالياً الأسعار من PRICING.pro أساساً)

## اختبار سريع

1. أضف منتجين → اطلب من السلة
2. في اللوحة: افتح الطلب → يجب أن ترى جدول البنود
3. صدّر CSV
4. حدّث الصفحة في المتجر → السلة تبقى
