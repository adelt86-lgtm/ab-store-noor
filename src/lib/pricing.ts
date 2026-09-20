export type PlanId = "free" | "pro";
export type BillingCycle = "monthly" | "yearly";

/** أسعار Pro النهائية: 1,500 دج/شهر · 15,000 دج/سنة (= شهرين مجاناً) */
export const PRICING = {
  free: {
    id: "free" as const,
    name: "مجاني",
    name_en: "Free",
    priceMonthly: 0,
    priceYearly: 0,
    productsLimit: 10,
    features: [
      "حتى 10 منتجات",
      "طلب عبر واتساب + الولايات",
      "0% عمولة على المبيعات",
      "رابط فرعي على المنصة",
      "إحصائيات أساسية",
      "شعار AB Store ظاهر للزبائن",
    ],
  },
  pro: {
    id: "pro" as const,
    name: "احترافي",
    name_en: "Pro",
    priceMonthly: 1500,
    priceYearly: 15000, // 18,000 - 3,000 = شهرين مجاناً
    productsLimit: null as number | null,
    features: [
      "منتجات غير محدودة",
      "إزالة شعار المنصة + اسم/شعار متجرك",
      "تخصيص أسعار التوصيل",
      "نطاق خاص (قريباً)",
      "Meta / TikTok Pixel",
      "إحصائيات شاملة",
      "دعم VIP واتساب/تيليغرام",
    ],
  },
} as const;

/** من Vercel: VITE_BARIDIMOB_RIP — وإلا placeholder */
export const BARIDIMOB_RIP =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_BARIDIMOB_RIP) ||
  "0079999900XXXXXX";

export const SUPPORT_WHATSAPP = "213555000000";

export function amountForCycle(cycle: BillingCycle): number {
  return cycle === "yearly" ? PRICING.pro.priceYearly : PRICING.pro.priceMonthly;
}

/** وفر عند اختيار السنوي مقارنة بـ 12 شهراً */
export function yearlySavingsDzd(): number {
  return PRICING.pro.priceMonthly * 12 - PRICING.pro.priceYearly; // 3000
}

export function isStorePro(store: {
  plan?: string | null;
  plan_expires_at?: string | null;
  hide_platform_brand?: boolean | null;
}): boolean {
  if (store?.plan !== "pro") return false;
  if (!store.plan_expires_at) return true;
  return new Date(store.plan_expires_at).getTime() > Date.now();
}

export function showPlatformBrand(store: {
  plan?: string | null;
  plan_expires_at?: string | null;
  hide_platform_brand?: boolean | null;
}): boolean {
  if (isStorePro(store)) return false;
  return true;
}
