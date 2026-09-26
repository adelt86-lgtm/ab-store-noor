import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

/** إنشاء طرد Yalidine مباشرة بمفاتيح التاجر المخزّنة في stores */
async function createYalidineParcel(
  apiId: string,
  apiToken: string,
  order: any,
  items: { product_name: string; quantity: number }[],
) {
  const base = process.env.YALIDINE_API_BASE || "https://api.yalidine.app/v1";
  const productList =
    items.length > 0
      ? items.map((i) => `${i.product_name} x${i.quantity || 1}`).join(" | ")
      : order.product_name || "Order";

  const nameParts = String(order.customer_name || "Client").trim().split(/\s+/);
  const payload = {
    order_id: String(order.id).slice(0, 50),
    from_wilaya_name: process.env.YALIDINE_FROM_WILAYA || "Alger",
    firstname: nameParts[0] || "Client",
    familyname: nameParts.slice(1).join(" ") || ".",
    contact_phone: order.phone,
    address: order.address || order.commune || "N/A",
    to_wilaya_name: order.wilaya_name || "Alger",
    to_commune_name: order.commune || undefined,
    product_list: productList,
    price: Number(order.total_price) || 0,
    do_insurance: false,
    declared_value: Number(order.total_price) || 0,
    stops: [],
  };

  const res = await fetch(`${base}/parcels`, {
    method: "POST",
    headers: {
      "X-API-ID": apiId,
      "X-API-TOKEN": apiToken,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify([payload]),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (body as any)?.message ||
      (body as any)?.error ||
      (Array.isArray(body) && (body as any)[0]?.message) ||
      `Yalidine ${res.status}`;
    throw new Error(String(msg));
  }

  const row = Array.isArray(body) ? body[0] : (body as any)?.data?.[0] || body;
  const tracking =
    row?.tracking ||
    row?.tracking_number ||
    row?.Tracking ||
    (body as any)?.tracking ||
    null;

  return {
    tracking_number: tracking ? String(tracking) : null,
    label_url: row?.label || row?.label_url || null,
    raw: body,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method_not_allowed" });

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
    const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
    if (!supabaseUrl || !anon) {
      return res.status(503).json({ ok: false, error: "supabase_not_configured" });
    }

    const authHeader = String(req.headers.authorization || "");
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ ok: false, error: "no_auth" });
    }

    const supabase = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return res.status(401).json({ ok: false, error: "unauthorized" });

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const orderId = body.order_id;
    if (!orderId) return res.status(400).json({ ok: false, error: "order_id_required" });

    const { data: order, error: oErr } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .single();
    if (oErr || !order) {
      return res.status(404).json({ ok: false, error: "order_not_found" });
    }
    if (order.tracking_number) {
      return res.status(409).json({
        ok: false,
        error: "already_shipped",
        tracking_number: order.tracking_number,
      });
    }

    const { data: store } = await supabase.from("stores").select("*").eq("id", order.store_id).single();
    if (!store) return res.status(404).json({ ok: false, error: "store_not_found" });

    const apiId = String(store.yalidine_api_id || "").trim();
    const apiToken = String(store.yalidine_api_token || "").trim();
    if (!apiId || !apiToken) {
      return res.status(400).json({
        ok: false,
        error: "yalidine_credentials_required",
        message: "اربط ياليدين من بيانات المتجر أولاً (API ID + Token)",
      });
    }

    const items = (order.order_items || []).map((i: any) => ({
      product_name: i.product_name,
      quantity: i.quantity,
    }));

    let result;
    try {
      result = await createYalidineParcel(apiId, apiToken, order, items);
    } catch (e: any) {
      return res.status(502).json({
        ok: false,
        error: "carrier_failed",
        message: e?.message || "رفض ياليدين الطرد — راجع المفتاح أو العنوان",
      });
    }

    await supabase
      .from("orders")
      .update({
        tracking_number: result.tracking_number,
        shipping_company: "yalidine",
        shipping_status: "created",
        shipped_at: new Date().toISOString(),
        label_url: result.label_url,
        status: "shipped",
      })
      .eq("id", orderId);

    return res.status(200).json({
      ok: true,
      tracking_number: result.tracking_number,
      carrier: "yalidine",
      label_url: result.label_url,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
