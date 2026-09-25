export type PlanId = "free" | "pro" | "pro_shipping";
export type BillingCycle = "monthly" | "yearly";

/** أسعار V2.1 الرسمية */
export const PRICING = {
  free: {
    id: "free" as const,
    name: "مجاني",
    name_en: "Free",
    priceMonthly: 0,
    priceYearly: 0,
    productsLimit: 10,
    ordersLimitPerMonth: 50, // حد مرن للتجربة (أرفع من 20 حتى لا يُقطع التاجر مبكراً)
    features: [
      "حتى 10 منتجات",
      "حتى 50 طلباً / شهر",
      "طلب عبر واتساب + الولايات",
      "0% عمولة على المبيعات",
      "رابط فرعي + QR",
      "تصدير CSV للشحن",
      "شعار AB Store ظاهر",
    ],
  },
  pro: {
    id: "pro" as const,
    name: "احترافي",
    name_en: "Pro",
    priceMonthly: 2400,
    priceYearly: 19000,
    productsLimit: null as number | null,
    ordersLimitPerMonth: null as number | null,
    features: [
      "منتجات غير محدودة",
      "طلبات بلا حد",
      "إزالة شعار المنصة",
      "لوجو واسم متجرك",
      "تصدير Excel/CSV للشحن",
      "تخصيص أسعار التوصيل",
      "دعم أولوية واتساب",
    ],
  },
  pro_shipping: {
    id: "pro_shipping" as const,
    name: "Pro شحن",
    name_en: "Pro Shipping",
    priceMonthly: 3900,
    priceYearly: 32000,
    productsLimit: null as number | null,
    ordersLimitPerMonth: null as number | null,
    features: [
      "كل مزايا Pro",
      "شحن بضغطة زر (Yalidine / ZR) — قريباً",
      "تتبع الطرد + Bordereau — قريباً",
      "أولوية قصوى للدعم",
      "دومين خاص (أولوية)",
    ],
  },
} as const;

export const BARIDIMOB_RIP =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_BARIDIMOB_RIP) ||
  "0079999900XXXXXX";

export const SUPPORT_WHATSAPP = "213555000000";

export function amountForCycle(
  plan: "pro" | "pro_shipping",
  cycle: BillingCycle
): number {
  const p = PRICING[plan];
  return cycle === "yearly" ? p.priceYearly : p.priceMonthly;
}

export function yearlySavingsDzd(plan: "pro" | "pro_shipping" = "pro"): number {
  const p = PRICING[plan];
  return p.priceMonthly * 12 - p.priceYearly;
}

/** Pro أو Pro Shipping = مدفوع فعّال */
export function isStorePro(store: {
  plan?: string | null;
  plan_expires_at?: string | null;
}): boolean {
  const plan = store?.plan;
  if (plan !== "pro" && plan !== "pro_shipping") return false;
  if (!store.plan_expires_at) return true;
  return new Date(store.plan_expires_at).getTime() > Date.now();
}

export function isStoreProShipping(store: {
  plan?: string | null;
  plan_expires_at?: string | null;
}): boolean {
  if (store?.plan !== "pro_shipping") return false;
  if (!store.plan_expires_at) return true;
  return new Date(store.plan_expires_at).getTime() > Date.now();
}

export function showPlatformBrand(store: {
  plan?: string | null;
  plan_expires_at?: string | null;
}): boolean {
  return !isStorePro(store);
}

export function productsLimitFor(store: {
  plan?: string | null;
  plan_expires_at?: string | null;
}): number | null {
  if (isStorePro(store)) return null;
  return PRICING.free.productsLimit;
}
