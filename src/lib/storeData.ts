import { supabase } from "./supabase";
import { PRICING, type PlanId } from "./pricing";

export type StoreRow = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  tagline: string | null;
  whatsapp: string | null;
  announcement: string | null;
  hero_title: string | null;
  hero_emphasis: string | null;
  hero_description: string | null;
  contact_title: string | null;
  contact_emphasis: string | null;
  is_published: boolean;
  plan: string;
  plan_expires_at: string | null;
  merchant_logo_url: string | null;
  hide_platform_brand: boolean;
  delivery_mode: "national" | "local_flat";
  local_delivery_price: number;
  local_delivery_free_over: number | null;
  is_open?: boolean;
  working_hours?: string | null;
  clothing_mode?: boolean;
  low_stock_threshold?: number;
  yalidine_api_id?: string | null;
  yalidine_api_token?: string | null;
  shipping_enabled?: boolean;
  preferred_carrier?: string | null;
  visit_count?: number | null;
};

export type ProductRow = {
  id: string;
  store_id: string;
  name: string;
  category: string | null;
  description: string | null;
  price: number;
  old_price: number | null;
  badge: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
};

export type UiSettings = {
  name: string;
  whatsapp: string;
  announcement: string;
  heroTitle: string;
  heroEmphasis: string;
  heroDescription: string;
  contactTitle: string;
  contactEmphasis: string;
};

export type UiProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  oldPrice?: number | null;
  badge: string;
  image: string;
  description: string;
  stock?: number | null;
  trackStock?: boolean;
  variants?: ProductVariant[];
};

export type ProductVariant = {
  id?: string;
  color?: string | null;
  pointure?: string | null;
  taille?: string | null;
  stock: number;
  is_active?: boolean;
};

function slugify(input: string) {
  const s = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return s || `store-${Date.now().toString(36)}`;
}

export async function getSessionUser() {
  // Use getSession(), not getUser(), for this "is anyone already logged in?"
  // check. getUser() re-validates the JWT against Supabase's server and
  // throws AuthSessionMissingError when there's no session at all — which
  // is the completely normal state for any first-time or logged-out
  // visitor, not an actual error. That thrown error was bubbling up and
  // being displayed as a scary "Auth session missing!" message on the
  // login page itself, before the visitor had even tried to log in.
  // getSession() simply returns { session: null } in that case.
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.user ?? null;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/callback`,
  });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });
  if (error) throw error;
  return data;
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function ensureStoreForUser(userId: string, email?: string | null): Promise<StoreRow> {
  const selectStore = async () => {
    const { data, error } = await supabase
      .from("stores")
      .select("id,owner_id,name,slug,tagline,whatsapp,announcement,hero_title,hero_emphasis,hero_description,contact_title,contact_emphasis,is_published,plan,plan_expires_at,merchant_logo_url,hide_platform_brand,delivery_mode,local_delivery_price,local_delivery_free_over,is_open,working_hours,clothing_mode,low_stock_threshold,yalidine_api_id,shipping_enabled,preferred_carrier,visit_count")
      .eq("owner_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data as StoreRow | null;
  };

  const existing = await selectStore();
  if (existing) return existing;

  const base = (email || "store").split("@")[0] || "store";
  const slug = slugify(base);

  for (let i = 0; i < 5; i++) {
    const trySlug = i === 0 ? slug : `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    const { data, error } = await supabase
      .from("stores")
      .insert({
        owner_id: userId,
        name: "متجري",
        slug: trySlug,
        whatsapp: "213555000000",
        announcement: "توصيل سريع · الدفع عند الاستلام",
        hero_title: "مرحباً بك",
        hero_emphasis: "في متجرك.",
        hero_description: "عدّل المنتجات والنصوص من لوحة التحكم.",
        contact_title: "تواصل معنا",
        contact_emphasis: "عبر واتساب.",
        is_published: true,
      })
      .select("*")
      .single();

    if (!error && data) return data as StoreRow;

    const isDuplicate = String(error?.message || "").toLowerCase().includes("duplicate");
    if (isDuplicate) {
      const concurrentStore = await selectStore();
      if (concurrentStore) return concurrentStore;
    } else if (error) {
      throw error;
    }
  }

  throw new Error("تعذر إنشاء المتجر");
}
export function storeToSettings(store: StoreRow): UiSettings {
  return {
    name: store.name || "متجري",
    whatsapp: store.whatsapp || "",
    announcement: store.announcement || "",
    heroTitle: store.hero_title || "",
    heroEmphasis: store.hero_emphasis || "",
    heroDescription: store.hero_description || "",
    contactTitle: store.contact_title || "",
    contactEmphasis: store.contact_emphasis || "",
  };
}

export function productFromRow(p: ProductRow): UiProduct {
  return {
    id: p.id,
    name: p.name,
    category: p.category || "عام",
    price: Number(p.price) || 0,
    oldPrice: p.old_price == null ? null : Number(p.old_price),
    badge: p.badge || "",
    image: p.image_url || "",
    description: p.description || "",
  };
}

export async function loadProducts(storeId: string): Promise<UiProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  const products = (data || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    category: r.category || "عام",
    price: Number(r.price) || 0,
    oldPrice: r.old_price != null ? Number(r.old_price) : null,
    badge: r.badge || "",
    image: r.image_url || "",
    description: r.description || "",
    stock: r.stock != null ? Number(r.stock) : null,
    trackStock: Boolean(r.track_stock),
    variants: [] as ProductVariant[],
  }));
  // Load variants if table exists
  try {
    const ids = products.map((p) => p.id);
    if (ids.length) {
      const { data: vars } = await supabase
        .from("product_variants")
        .select("*")
        .in("product_id", ids);
      if (vars?.length) {
        const by: Record<string, ProductVariant[]> = {};
        for (const v of vars) {
          const pid = v.product_id;
          if (!by[pid]) by[pid] = [];
          by[pid].push({
            id: v.id,
            color: v.color,
            pointure: v.pointure,
            taille: v.taille,
            stock: Number(v.stock) || 0,
            is_active: v.is_active !== false,
          });
        }
        for (const p of products) p.variants = by[p.id] || [];
      }
    }
  } catch {
    /* table may not exist yet */
  }
  return products;
}

export async function loadChannels(storeId: string): Promise<Record<string, boolean>> {
  const base: Record<string, boolean> = {
    WhatsApp: true,
    Facebook: false,
    Instagram: false,
    Messenger: false,
    Telegram: false,
    TikTok: false,
  };
  const { data, error } = await supabase.from("store_channels").select("*").eq("store_id", storeId);
  if (error) throw error;
  for (const row of data || []) {
    const key = String(row.channel || "").toLowerCase();
    const map: Record<string, string> = {
      whatsapp: "WhatsApp",
      facebook: "Facebook",
      instagram: "Instagram",
      messenger: "Messenger",
      telegram: "Telegram",
      tiktok: "TikTok",
    };
    const ui = map[key] || row.channel;
    base[ui] = Boolean(row.is_active);
  }
  return base;
}

export async function saveStoreSettings(storeId: string, settings: UiSettings) {
  const { error } = await supabase
    .from("stores")
    .update({
      name: settings.name,
      whatsapp: settings.whatsapp,
      announcement: settings.announcement,
      hero_title: settings.heroTitle,
      hero_emphasis: settings.heroEmphasis,
      hero_description: settings.heroDescription,
      contact_title: settings.contactTitle,
      contact_emphasis: settings.contactEmphasis,
    })
    .eq("id", storeId);
  if (error) throw error;
}

export async function saveChannels(storeId: string, channels: Record<string, boolean>) {
  const map: Record<string, string> = {
    WhatsApp: "whatsapp",
    Facebook: "facebook",
    Instagram: "instagram",
    Messenger: "messenger",
    Telegram: "telegram",
    TikTok: "tiktok",
  };
  for (const [label, active] of Object.entries(channels)) {
    const channel = map[label] || label.toLowerCase();
    const { error } = await supabase.from("store_channels").upsert(
      { store_id: storeId, channel, is_active: active },
      { onConflict: "store_id,channel" }
    );
    if (error) throw error;
  }
}

export type SocialLinks = Record<string, string>;

export async function loadPublicSocialLinks(storeId: string): Promise<SocialLinks> {
  const out: SocialLinks = {};
  const { data, error } = await supabase
    .from("store_channels")
    .select("channel,url,is_active")
    .eq("store_id", storeId)
    .eq("is_active", true);
  if (error) return out;
  const map: Record<string, string> = {
    facebook: "Facebook",
    instagram: "Instagram",
    telegram: "Telegram",
    tiktok: "TikTok",
  };
  for (const row of data || []) {
    const key = map[String(row.channel || "").toLowerCase()];
    const url = String(row.url || "").trim();
    if (key && url) out[key] = url;
  }
  return out;
}

export async function loadSocialLinks(storeId: string): Promise<SocialLinks> {
  const out: SocialLinks = {};
  const { data, error } = await supabase
    .from("store_channels")
    .select("channel,url")
    .eq("store_id", storeId);
  if (error) throw error;
  const map: Record<string, string> = {
    facebook: "Facebook",
    instagram: "Instagram",
    telegram: "Telegram",
    tiktok: "TikTok",
  };
  for (const row of data || []) {
    const key = map[String(row.channel || "").toLowerCase()];
    if (key) out[key] = String(row.url || "");
  }
  return out;
}

export async function saveSocialLinks(storeId: string, links: SocialLinks) {
  const map: Record<string, string> = {
    Facebook: "facebook",
    Instagram: "instagram",
    Telegram: "telegram",
    TikTok: "tiktok",
  };
  for (const [label, url] of Object.entries(links)) {
    const channel = map[label];
    if (!channel) continue;
    const { error } = await supabase.from("store_channels").upsert(
      { store_id: storeId, channel, url: String(url || "").trim() || null },
      { onConflict: "store_id,channel" }
    );
    if (error) throw error;
  }
}

export async function replaceProducts(storeId: string, products: UiProduct[]) {
  // Soft approach: update/insert by id when possible; fallback delete+insert
  const { data: existing } = await supabase
    .from("products")
    .select("id")
    .eq("store_id", storeId);
  const existingIds = new Set((existing || []).map((r: any) => r.id));
  const keepIds = new Set(products.map((p) => p.id).filter(Boolean));

  // Delete removed products (FK on orders should be dropped)
  for (const id of existingIds) {
    if (!keepIds.has(id)) {
      await supabase.from("products").delete().eq("id", id);
    }
  }

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    if (!p) continue;
    const row: any = {
      store_id: storeId,
      name: p.name,
      category: p.category,
      description: p.description,
      price: p.price,
      old_price: p.oldPrice ?? null,
      badge: p.badge,
      image_url: p.image && !String(p.image).startsWith("data:") ? p.image : null,
      sort_order: i,
      is_active: true,
      stock: p.trackStock ? (p.stock ?? 0) : null,
      track_stock: Boolean(p.trackStock),
    };
    if (existingIds.has(p.id)) {
      const { error } = await supabase.from("products").update(row).eq("id", p.id);
      if (error) throw error;
    } else {
      const insertRow = { ...row, id: p.id };
      const { error } = await supabase.from("products").insert(insertRow);
      if (error) {
        // id may not be client uuid compatible — insert without id
        const { id: _omit, ...rest } = insertRow;
        const { data: created, error: e2 } = await supabase
          .from("products")
          .insert(rest)
          .select("id")
          .single();
        if (e2) throw e2;
        if (created?.id) p.id = created.id;
      }
    }
    // Variants
    if (p.variants && p.variants.length) {
      await supabase.from("product_variants").delete().eq("product_id", p.id);
      const vrows = p.variants.map((v) => ({
        product_id: p.id,
        color: v.color || null,
        pointure: v.pointure || null,
        taille: v.taille || null,
        stock: Number(v.stock) || 0,
        is_active: v.is_active !== false,
      }));
      const { error: ve } = await supabase.from("product_variants").insert(vrows);
      if (ve) throw ve;
    }
  }
}

export async function uploadProductImage(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("product-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}

/** رفع بانر/شعار التاجر الخاص (ميزة Pro) — نفس bucket الصور العامة، مسار مخصَّص واضح */
export async function uploadMerchantLogo(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/brand-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("product-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}

/**
 * تفعيل/إيقاف البانر الخاص بالتاجر. القاعدة نفسها (trigger) ترفض تفعيل
 * hide_platform_brand إذا لم يكن المتجر Pro فعلياً — هذا الحارس هنا فقط
 * لتجربة استخدام أوضح، وليس خط الدفاع الحقيقي.
 */
export async function saveMerchantBanner(
  storeId: string,
  opts: { merchantLogoUrl?: string | null; hidePlatformBrand: boolean }
) {
  const patch: Record<string, unknown> = { hide_platform_brand: opts.hidePlatformBrand };
  if (opts.merchantLogoUrl !== undefined) patch["merchant_logo_url"] = opts.merchantLogoUrl;
  const { error } = await supabase.from("stores").update(patch).eq("id", storeId);
  if (error) throw error;
}

/** إعدادات التوصيل: وطني (جدول الولايات) أو محلي بسعر ثابت يضبطه التاجر */
export async function saveDeliverySettings(
  storeId: string,
  opts: { mode: "national" | "local_flat"; price: number; freeOver: number | null }
) {
  const { error } = await supabase
    .from("stores")
    .update({
      delivery_mode: opts.mode,
      local_delivery_price: opts.price,
      local_delivery_free_over: opts.freeOver,
    })
    .eq("id", storeId);
  if (error) throw error;
}

/** تسجيل زيارة واحدة لكل فتح لصفحة المتجر (عامة) */
export type PlatformStats = {
  stores: number;
  newStores: number;
  products: number;
  visits: number;
  storeVisits: number;
  demoMode?: boolean;
};

export async function recordPlatformVisit(): Promise<number | null> {
  try {
    const { data, error } = await supabase.rpc("record_platform_visit");
    if (error) {
      console.warn("[platform-visit]", error.message);
      return null;
    }
    return Number(data) || 0;
  } catch {
    return null;
  }
}

export async function loadPlatformStats(): Promise<PlatformStats> {
  const fallback: PlatformStats = { stores: 0, newStores: 0, products: 0, visits: 0, storeVisits: 0, demoMode: false };
  try {
    const { data, error } = await supabase.rpc("get_public_platform_stats");
    if (error || !data) return fallback;
    return {
      stores: Number(data.stores) || 0,
      newStores: Number(data.new_stores) || 0,
      products: Number(data.products) || 0,
      visits: Number(data.visits) || 0,
      storeVisits: Number(data.store_visits) || 0,
      demoMode: Boolean(data.demo_mode),
    };
  } catch {
    return fallback;
  }
}

export async function recordStoreVisit(slug: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc("increment_store_visit", { p_slug: slug });
    if (error) {
      console.warn("[visit]", error.message);
      return 0;
    }
    return Number(data) || 0;
  } catch {
    return 0;
  }
}

export async function loadPublicStore(slug: string) {
  const { data: store, error } = await supabase
    .from("stores")
    .select("id,name,slug,tagline,whatsapp,announcement,hero_title,hero_emphasis,hero_description,contact_title,contact_emphasis,is_published,plan,plan_expires_at,merchant_logo_url,hide_platform_brand,delivery_mode,local_delivery_price,local_delivery_free_over,is_open,working_hours,clothing_mode,low_stock_threshold,shipping_enabled,preferred_carrier,visit_count")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) throw error;
  if (!store) return null;
  const products = await loadProducts(store.id);
  return { store: store as StoreRow, products };
}


export type OrderStatus = "new" | "confirmed" | "shipped" | "done" | "cancelled";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  new: "جديد",
  confirmed: "مؤكد",
  shipped: "قيد التوصيل",
  done: "مكتمل",
  cancelled: "ملغى",
};

export type OrderInsert = {
  store_id: string;
  customer_name: string;
  phone: string;
  wilaya_code: number;
  wilaya_name: string;
  commune: string | null;
  delivery_type: "home" | "desk";
  product_name: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  shipping_price: number;
  total_price: number;
  status?: string;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
};

export type OrderRow = {
  id: string;
  store_id: string;
  customer_name: string;
  phone: string;
  wilaya_code: number | null;
  wilaya_name: string | null;
  commune: string | null;
  address?: string | null;
  delivery_type: string;
  product_name: string;
  product_id: string | null;
  quantity: number;
  unit_price: number;
  shipping_price: number;
  total_price: number;
  status: OrderStatus;
  created_at: string;
  tracking_number?: string | null;
  shipping_company?: string | null;
  shipping_status?: string | null;
  items?: OrderItemRow[];
};

export async function loadOrders(storeId: string): Promise<OrderRow[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });
  if (error) {
    // Fallback if order_items relation missing
    const { data: d2, error: e2 } = await supabase
      .from("orders")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    if (e2) throw e2;
    return (d2 || []).map((o: any) => ({ ...o, items: [] })) as OrderRow[];
  }
  return (data || []).map((o: any) => ({
    ...o,
    items: (o.order_items || []) as OrderItemRow[],
  })) as OrderRow[];
}

export async function markOrderDone(orderId: string) {
  return updateOrderStatus(orderId, "done");
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const { error } = await supabase.rpc("update_order_status", {
    p_order_id: orderId,
    p_status: status,
  });
  if (error) throw error;
}

export async function deleteOrder(orderId: string) {
  const { error } = await supabase.rpc("delete_order", { p_order_id: orderId });
  if (error) throw error;
}

export async function setStoreOpen(storeId: string, isOpen: boolean) {
  const { error } = await supabase
    .from("stores")
    .update({ is_open: isOpen })
    .eq("id", storeId);
  if (error) throw error;
}


export type CartItemInsert = {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price?: number;
};

export type CartOrderInsert = {
  store_id: string;
  customer_name: string;
  phone: string;
  wilaya_code: number | null;
  wilaya_name: string;
  commune: string | null;
  delivery_type: "home" | "desk";
  address?: string | null;
  shipping_price: number;
  items: CartItemInsert[];
};

/**
 * إنشاء طلب ذري عبر RPC. الأسعار والمخزون والتحقق من المنتج تتم في قاعدة البيانات؛
 * قيم السعر القادمة من المتصفح ليست مصدراً موثوقاً للحساب النهائي.
 */
export async function submitCartOrder(order: CartOrderInsert) {
  if (!order.items.length) throw new Error("السلة فارغة");
  if (order.items.some((item) => !item.product_id || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99)) {
    throw new Error("كمية المنتج غير صالحة");
  }
  if (order.items.some((item) => Number(item.unit_price) < 0)) throw new Error("سعر غير صالح");

  const { data, error } = await supabase.rpc("create_cart_order", {
    p_store_id: order.store_id,
    p_customer_name: order.customer_name,
    p_phone: order.phone,
    p_wilaya_code: order.wilaya_code,
    p_wilaya_name: order.wilaya_name,
    p_commune: order.commune || null,
    p_address: order.address || null,
    p_delivery_type: order.delivery_type,
    // Kept in the RPC contract for compatibility; DB calculates the final fee.
    p_shipping_price: Math.max(0, Number(order.shipping_price) || 0),
    p_items: order.items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      // Deliberately omitted from pricing: DB is authoritative.
      product_name: item.product_name,
      unit_price: Number(item.unit_price) || 0,
    })),
  });
  if (error) {
    const messageMap: Record<string, string> = {
      free_plan_order_limit: "وصل المتجر إلى 30 طلباً هذا الشهر ضمن الخطة المجانية.",
      store_closed: "المتجر مغلق حالياً ولا يستقبل طلبات.",
      product_unavailable: "أحد المنتجات لم يعد متاحاً. حدّث السلة وحاول مرة أخرى.",
      out_of_stock: "أحد المنتجات نفد مخزونه.",
    };
    throw new Error(messageMap[error.message] || error.message);
  }
  const result = (data || {}) as { id?: string; subtotal?: number; shipping_price?: number; total_price?: number; items?: { name: string; quantity: number; unit_price: number }[] };
  if (!result.id) throw new Error("تعذر تأكيد الطلب");
  return {
    id: result.id,
    subtotal: Number(result.subtotal) || 0,
    shipping_price: Number(result.shipping_price) || 0,
    total_price: Number(result.total_price) || 0,
    items: Array.isArray(result.items) ? result.items : [],
  };
}

export type SubscriptionRequestRow = {
  id: string;
  store_id: string | null;
  owner_id: string | null;
  plan_type: string | null;
  plan_requested: string | null;
  billing_cycle: string | null;
  amount: number | null;
  payment_method: string | null;
  receipt_url: string | null;
  cardless_code: string | null;
  operation_number: string | null;
  phone_number: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export async function loadSubscriptionRequests(status?: string): Promise<SubscriptionRequestRow[]> {
  let q = supabase
    .from("subscription_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as SubscriptionRequestRow[];
}

/** موافقة يدوية: تفعيل Pro على المتجر + تحديث حالة الطلب، في معاملة ذرّية واحدة عبر RPC */
export async function approveSubscriptionRequest(
  requestId: string,
  _storeId: string,
  billingCycle: string | null,
  planRequested: string | null = "pro"
) {
  const { error } = await supabase.rpc("approve_subscription_request", {
    p_request_id: requestId,
    p_billing_cycle: billingCycle,
    p_plan_requested: planRequested || "pro",
  });
  if (error) throw error;
}

export async function rejectSubscriptionRequest(requestId: string, note?: string) {
  const { error } = await supabase
    .from("subscription_requests")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      admin_note: note || null,
    })
    .eq("id", requestId)
    .eq("status", "pending");
  if (error) throw error;
}


export async function uploadReceipt(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("payment-receipts").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  // payment-receipts is a private bucket — store the path itself (not a
  // public URL, which wouldn't exist here) and mint a short-lived signed
  // URL only when someone with access actually needs to view it.
  return path;
}

export async function getReceiptSignedUrl(path: string, expiresInSeconds = 300): Promise<string> {
  const { data, error } = await supabase.storage.from("payment-receipts").createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

/** يرسل طلب Pro إلى subscription_requests (أسماء أعمدة الجدول الحالية) */
export async function submitUpgradeRequest(payload: {
  store_id: string;
  owner_id: string;
  plan_requested?: Exclude<PlanId, "free">;
  billing_cycle: "monthly" | "yearly";
  amount_dzd: number;
  payment_method: "baridimob" | "gab_retrait" | "both";
  receipt_url?: string | null;
  gab_code?: string | null;
  operation_number?: string | null;
  phone?: string | null;
}) {
  const plan_requested = payload.plan_requested || "pro";
  const amount = Number(
    payload.amount_dzd ||
      (payload.billing_cycle === "yearly"
        ? PRICING[plan_requested].priceYearly
        : PRICING[plan_requested].priceMonthly)
  );
  // Keep the legacy plan_type column compatible with older deployments.
  const plan_type = payload.billing_cycle;

  const { data, error } = await supabase
    .from("subscription_requests")
    .insert({
      store_id: payload.store_id,
      owner_id: payload.owner_id,
      plan_type,
      plan_requested,
      billing_cycle: payload.billing_cycle,
      amount,
      payment_method: payload.payment_method,
      receipt_url: payload.receipt_url || null,
      cardless_code: payload.gab_code || null,
      operation_number: payload.operation_number || null,
      phone_number: payload.phone || null,
      status: "pending",
    })
    .select("id")
    .single();
  if (error) throw error;

  // Notify Super Admin on Telegram without blocking the subscription request.
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (token && data?.id) {
      const response = await fetch("/api/telegram-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ request_id: data.id }),
      });

      if (!response.ok) {
        console.warn("[subscription] Telegram notification failed:", await response.text());
      }
    }
  } catch (telegramError) {
    console.warn("[subscription] Telegram notification failed:", telegramError);
  }

  return data;
}



export async function saveWorkingHours(storeId: string, workingHours: string) {
  const { error } = await supabase
    .from("stores")
    .update({ working_hours: workingHours || null })
    .eq("id", storeId);
  if (error) throw error;
}


/** إعدادات المخزون ووضع الملابس/الأحذية */
export async function saveClothingStockSettings(
  storeId: string,
  opts: { clothing_mode: boolean; low_stock_threshold: number }
) {
  const { error } = await supabase
    .from("stores")
    .update({
      clothing_mode: opts.clothing_mode,
      low_stock_threshold: opts.low_stock_threshold,
    })
    .eq("id", storeId);
  if (error) throw error;
}

/** خصم مخزون بسيط بعد طلب ناجح (منتج بدون متغيرات) */
export async function decrementProductStock(productId: string, qty: number) {
  const { data, error } = await supabase
    .from("products")
    .select("stock, track_stock")
    .eq("id", productId)
    .maybeSingle();
  if (error || !data || !data.track_stock) return;
  const next = Math.max(0, (Number(data.stock) || 0) - qty);
  await supabase.from("products").update({ stock: next }).eq("id", productId);
}


/** حفظ مفاتيح ياليدين للتاجر — من لوحة المتجر */
export async function saveYalidineSettings(
  storeId: string,
  opts: { yalidine_api_id: string; yalidine_api_token?: string; shipping_enabled?: boolean }
) {
  const patch: Record<string, unknown> = {
    yalidine_api_id: opts.yalidine_api_id.trim() || null,
    shipping_enabled: opts.shipping_enabled !== false,
    preferred_carrier: "yalidine",
  };
  // Empty token means “keep the existing server-side secret”.
  const token = opts["yalidine_api_token"]?.trim();
  if (token) patch["yalidine_api_token"] = token;
  const { error } = await supabase
    .from("stores")
    .update(patch)
    .eq("id", storeId);
  if (error) throw error;
}
