import { supabase } from "./supabase";

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
  const { data: existing, error: findErr } = await supabase
    .from("stores")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (findErr) throw findErr;
  if (existing) return existing as StoreRow;

  const base = (email || "store").split("@")[0];
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
    if (error && !String(error.message).toLowerCase().includes("duplicate")) throw error;
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
  return (data || []).map((r) => productFromRow(r as ProductRow));
}

export async function loadChannels(storeId: string): Promise<Record<string, boolean>> {
  const base: Record<string, boolean> = {
    WhatsApp: true,
    Facebook: false,
    Instagram: false,
    Messenger: false,
    Telegram: false,
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

export async function replaceProducts(storeId: string, products: UiProduct[]) {
  const { error: delErr } = await supabase.from("products").delete().eq("store_id", storeId);
  if (delErr) throw delErr;
  if (!products.length) return;
  const rows = products.map((p, i) => ({
    store_id: storeId,
    name: p.name,
    category: p.category,
    description: p.description,
    price: p.price,
    old_price: p.oldPrice ?? null,
    badge: p.badge,
    image_url: p.image && !p.image.startsWith("data:") ? p.image : null,
    sort_order: i,
    is_active: true,
  }));
  const { error } = await supabase.from("products").insert(rows);
  if (error) throw error;
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

export async function loadPublicStore(slug: string) {
  const { data: store, error } = await supabase
    .from("stores")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) throw error;
  if (!store) return null;
  const products = await loadProducts(store.id);
  return { store: store as StoreRow, products };
}


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

export type OrderRow = {
  id: string;
  store_id: string;
  customer_name: string;
  phone: string;
  wilaya_code: number | null;
  wilaya_name: string | null;
  commune: string | null;
  delivery_type: string;
  product_name: string;
  product_id: string | null;
  quantity: number;
  unit_price: number;
  shipping_price: number;
  total_price: number;
  status: "new" | "done";
  created_at: string;
};

export async function loadOrders(storeId: string): Promise<OrderRow[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as OrderRow[];
}

export async function markOrderDone(orderId: string) {
  const { error } = await supabase
    .from("orders")
    .update({ status: "done" })
    .eq("id", orderId);
  if (error) throw error;
}

export async function submitStoreOrder(order: OrderInsert) {
  const { data, error } = await supabase
    .from("orders")
    .insert({
      store_id: order.store_id,
      customer_name: order.customer_name,
      phone: order.phone,
      wilaya_code: order.wilaya_code,
      wilaya_name: order.wilaya_name,
      commune: order.commune,
      delivery_type: order.delivery_type,
      product_name: order.product_name,
      product_id: order.product_id,
      quantity: order.quantity,
      unit_price: order.unit_price,
      shipping_price: order.shipping_price,
      total_price: order.total_price,
      status: order.status || "new",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

export type SubscriptionRequestRow = {
  id: string;
  store_id: string | null;
  owner_id: string | null;
  plan_type: string | null;
  billing_cycle: string | null;
  amount: number | null;
  payment_method: string | null;
  receipt_url: string | null;
  cardless_code: string | null;
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
  billingCycle: string | null
) {
  const { error } = await supabase.rpc("approve_subscription_request", {
    p_request_id: requestId,
    p_billing_cycle: billingCycle,
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
  billing_cycle: "monthly" | "yearly";
  amount_dzd: number;
  payment_method: "baridimob" | "gab_retrait";
  receipt_url?: string | null;
  gab_code?: string | null;
  phone?: string | null;
}) {
  const { data, error } = await supabase
    .from("subscription_requests")
    .insert({
      store_id: payload.store_id,
      owner_id: payload.owner_id,
      plan_type: "pro",
      billing_cycle: payload.billing_cycle,
      amount: payload.amount_dzd,
      payment_method: payload.payment_method,
      receipt_url: payload.receipt_url || null,
      cardless_code: payload.gab_code || null,
      phone_number: payload.phone || null,
      status: "pending",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data;
}
