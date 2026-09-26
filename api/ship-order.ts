import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

/**
 * Vercel Serverless: replaces Supabase Edge Function for Termux/Android deploys.
 * Env (Vercel project settings):
 *   VITE_SUPABASE_URL or SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY
 *   SALES_ENGINE_URL
 *   ENGINE_INTERNAL_SECRET
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method_not_allowed" });

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
    const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
    const engineUrl = (process.env.SALES_ENGINE_URL || "").replace(/\/$/, "");
    const engineSecret = process.env.ENGINE_INTERNAL_SECRET || "";

    if (!supabaseUrl || !anon) {
      return res.status(503).json({ ok: false, error: "supabase_not_configured" });
    }
    if (!engineUrl || !engineSecret) {
      return res.status(503).json({ ok: false, error: "engine_not_configured" });
    }

    const authHeader = String(req.headers.authorization || "");
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ ok: false, error: "no_auth" });
    }

    const supabase = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const orderId = body.order_id;
    const carrier = body.carrier || "yalidine";
    if (!orderId) return res.status(400).json({ ok: false, error: "order_id_required" });

    const { data: order, error: oErr } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .single();

    if (oErr || !order) {
      return res.status(404).json({ ok: false, error: "order_not_found", detail: oErr?.message });
    }
    if (order.tracking_number) {
      return res.status(409).json({
        ok: false,
        error: "already_shipped",
        tracking_number: order.tracking_number,
      });
    }

    const { data: store, error: sErr } = await supabase
      .from("stores")
      .select("*")
      .eq("id", order.store_id)
      .single();

    if (sErr || !store) {
      return res.status(404).json({ ok: false, error: "store_not_found" });
    }

    const items = (order.order_items || []).map((i: any) => ({
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price: Number(i.unit_price) || 0,
    }));

    const credentials =
      carrier === "zr_express"
        ? { token: store.zr_api_token, key: store.zr_api_key }
        : { api_id: store.yalidine_api_id, api_token: store.yalidine_api_token };

    const payload = {
      store_id: store.id,
      order_id: order.id,
      carrier,
      credentials,
      customer: {
        name: order.customer_name,
        phone: order.phone,
        wilaya_code: order.wilaya_code,
        wilaya_name: order.wilaya_name,
        commune: order.commune,
        address: order.address || order.commune || "",
        delivery_type: order.delivery_type === "desk" ? "stopdesk" : "home",
      },
      items,
      cod_amount: Number(order.total_price) || 0,
      notes: "",
      product_summary: order.product_name,
    };

    const engineRes = await fetch(`${engineUrl}/internal/v1/shipments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${engineSecret}`,
      },
      body: JSON.stringify(payload),
    });

    const engineJson: any = await engineRes.json().catch(() => ({}));
    if (!engineRes.ok || !engineJson.ok) {
      return res.status(502).json({
        ok: false,
        error: engineJson.error || "engine_failed",
        message: engineJson.message || "تعذّر إنشاء الطرد — جرّب تصدير CSV",
      });
    }

    await supabase
      .from("orders")
      .update({
        tracking_number: engineJson.tracking_number,
        shipping_company: engineJson.carrier,
        shipping_status: "created",
        shipped_at: new Date().toISOString(),
        label_url: engineJson.label_url,
        status: "shipped",
      })
      .eq("id", orderId);

    return res.status(200).json({
      ok: true,
      tracking_number: engineJson.tracking_number,
      carrier: engineJson.carrier,
      label_url: engineJson.label_url,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
