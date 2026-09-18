export type PlanId = "free" | "pro";
export type BillingCycle = "monthly" | "yearly";

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
      "شعار AB Store Noor ظاهر",
    ],
  },
  pro: {
    id: "pro" as const,
    name: "احترافي",
    name_en: "Pro",
    priceMonthly: 1500,
    priceYearly: 15000, // توفير شهرين
    productsLimit: null as number | null, // unlimited
    features: [
      "منتجات غير محدودة",
      "إزالة شعار المنصة + شعارك",
      "تخصيص أسعار التوصيل",
      "نطاق خاص (قريباً)",
      "Meta / TikTok Pixel",
      "إحصائيات شاملة",
      "دعم VIP واتساب/تيليغرام",
    ],
  },
} as const;

export const BARIDIMOB_RIP = "0079999900XXXXXX"; // استبدله برقم RIP الحقيقي
export const SUPPORT_WHATSAPP = "213555000000";

export function amountForCycle(cycle: BillingCycle): number {
  return cycle === "yearly" ? PRICING.pro.priceYearly : PRICING.pro.priceMonthly;
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
  // Pro (ساري) → إخفاء شعار المنصة
  if (isStorePro(store)) return false;
  return true;
}
