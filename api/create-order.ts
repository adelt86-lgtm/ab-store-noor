import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const env = (k: string) => (process.env[k] || "").trim();
const isUuid = (v: unknown) => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);
const isAlgerianPhone = (v: unknown) => {
  const phone = String(v ?? "").replace(/[\s()-]/g, "");
  return /^(?:0|\+213)(5|6|7)\d{8}$/.test(phone);
};
const str = (v: unknown, max: number) => String(v ?? "").slice(0, max);

function cors(req: VercelRequest, res: VercelResponse) {
  const origin = env("APP_ORIGIN");
  const reqOrigin = String(req.headers.origin || "");
  if (origin && reqOrigin === origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function verifyTurnstile(token: string, ip: string) {
  const secret = env("TURNSTILE_SECRET_KEY");
  // CAPTCHA must fail closed: never accept orders when the secret is missing.
  if (!secret) {
    console.error("[create-order] TURNSTILE_SECRET_KEY missing: captcha verification unavailable");
    return false;
  }
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const j: any = await r.json();
    return j?.success === true;
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method_not_allowed" });

  const reqOrigin = String(req.headers.origin || "");
  const allowed = env("APP_ORIGIN");
  if (allowed && reqOrigin && reqOrigin !== allowed) return res.status(403).json({ ok: false, error: "forbidden_origin" });

  const b: any = typeof req.body === "string" ? safeJson(req.body) : req.body || {};
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();

  if (!isAlgerianPhone(b.phone)) {
    return res.status(400).json({ ok: false, error: "invalid_phone" });
  }

  if (!(await verifyTurnstile(String(b.captchaToken || ""), ip))) {
    return res.status(400).json({ ok: false, error: b.captchaToken ? "captcha_failed" : "captcha_required" });
  }

  const items = Array.isArray(b.items) ? b.items.slice(0, 50) : [];
  if (!isUuid(b.store_id) || !items.length) return res.status(400).json({ ok: false, error: "invalid_order" });
  for (const it of items) {
    if (!isUuid(it?.product_id) || !Number.isInteger(it?.quantity) || it.quantity < 1 || it.quantity > 99) {
      return res.status(400).json({ ok: false, error: "invalid_order" });
    }
  }

  const url = env("SUPABASE_URL") || env("VITE_SUPABASE_URL");
  const service = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !service) {
    console.error("[create-order] service role not configured");
    return res.status(500).json({ ok: false, error: "server_not_configured" });
  }

  const db = createClient(url, service, { auth: { persistSession: false } });
  const { data, error } = await db.rpc("create_cart_order", {
    p_store_id: b.store_id,
    p_customer_name: str(b.customer_name, 120),
    p_phone: str(b.phone, 20),
    p_wilaya_code: b.wilaya_code === null || b.wilaya_code === undefined ? null : Number(b.wilaya_code),
    p_wilaya_name: str(b.wilaya_name, 80),
    p_commune: b.commune ? str(b.commune, 120) : null,
    p_address: b.address ? str(b.address, 300) : null,
    p_delivery_type: b.delivery_type === "desk" ? "desk" : "home",
    p_shipping_price: Math.max(0, Number(b.shipping_price) || 0),
    p_items: items.map((it: any) => ({
      product_id: it.product_id,
      variant_id: isUuid(it?.variant_id) ? it.variant_id : null,
      quantity: it.quantity,
      product_name: str(it.product_name, 200),
      unit_price: Number(it.unit_price) || 0,
    })),
  });

  if (error) {
    console.warn("[create-order] rpc error:", error.message);
    return res.status(400).json({ ok: false, error: String(error.message || "order_failed").slice(0, 80) });
  }
  return res.status(200).json({ ok: true, data });
}

function safeJson(s: string) {
  try { return JSON.parse(s); } catch { return {}; }
}
