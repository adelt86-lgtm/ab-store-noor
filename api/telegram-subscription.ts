import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

function env(name: string) {
  return process.env[name] || "";
}

function cors(req: VercelRequest, res: VercelResponse) {
  const origin = String(req.headers.origin || "");
  const allowed = env("APP_ORIGIN").replace(/\/$/, "");
  if (allowed && origin === allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
}

function db() {
  const url = env("SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("service_role_not_configured");
  return createClient(url, key);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(req, res);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  try {
    const auth = String(req.headers.authorization || "");
    if (!auth.startsWith("Bearer ")) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    const url = env("SUPABASE_URL");
    const anon = env("SUPABASE_ANON_KEY");
    if (!url || !anon) {
      return res.status(503).json({ ok: false, error: "supabase_not_configured" });
    }

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: auth } },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const requestId = String(body.request_id || "").trim();

    if (!requestId) {
      return res.status(400).json({ ok: false, error: "request_id_required" });
    }

    const database = db();

    const { data: request, error: requestError } = await database
      .from("subscription_requests")
      .select("id,store_id,owner_id,plan_requested,billing_cycle,amount,payment_method,cardless_code,operation_number,phone_number,status,created_at")
      .eq("id", requestId)
      .eq("owner_id", authData.user.id)
      .maybeSingle();

    if (requestError) throw requestError;
    if (!request) {
      return res.status(404).json({ ok: false, error: "request_not_found" });
    }

    const { data: store } = await database
      .from("stores")
      .select("name,slug")
      .eq("id", request.store_id)
      .maybeSingle();

    const token = env("TELEGRAM_BOT_TOKEN");
    const chatId = env("TELEGRAM_ADMIN_CHAT_ID");

    if (!token || !chatId) {
      return res.status(503).json({ ok: false, error: "telegram_not_configured" });
    }

    const plan =
      request.plan_requested === "pro_shipping"
        ? "Pro شحن"
        : request.plan_requested === "pro"
          ? "Pro"
          : request.plan_requested || "—";

    const cycle =
      request.billing_cycle === "yearly"
        ? "سنوي"
        : request.billing_cycle === "monthly"
          ? "شهري"
          : request.billing_cycle || "—";

    const payment =
      request.payment_method === "gab_retrait"
        ? "سحب بدون بطاقة"
        : request.payment_method === "baridimob"
          ? "BaridiMob"
          : request.payment_method === "both"
            ? "الاثنان"
            : request.payment_method || "—";

    const message = [
      "🔔 <b>طلب اشتراك جديد</b>",
      "",
      `🏪 <b>المتجر:</b> ${store?.name || "—"}`,
      `🔗 <b>Slug:</b> ${store?.slug || "—"}`,
      `📦 <b>الباقة:</b> ${plan}`,
      `📅 <b>الدورة:</b> ${cycle}`,
      `💰 <b>المبلغ:</b> ${Number(request.amount || 0).toLocaleString("ar-DZ")} دج`,
      `💳 <b>طريقة الدفع:</b> ${payment}`,
      request.operation_number ? `🔢 <b>رقم العملية:</b> ${request.operation_number}` : "",
      request.cardless_code ? `🔐 <b>رمز السحب:</b> ${request.cardless_code}` : "",
      request.phone_number ? `📱 <b>الهاتف:</b> ${request.phone_number}` : "",
      `🆔 <b>Request ID:</b> <code>${request.id}</code>`,
      `⏳ <b>الحالة:</b> ${request.status}`,
    ]
      .filter(Boolean)
      .join("\n");

    const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    const tgData = await tg.json().catch(() => null);

    if (!tg.ok || !tgData?.ok) {
      console.error("[telegram] sendMessage failed:", {
        status: tg.status,
        description: tgData?.description || "telegram_error",
      });

      return res.status(502).json({
        ok: false,
        error: "telegram_send_failed",
        detail: tgData?.description || "telegram_error",
      });
    }

    return res.json({ ok: true, sent: true });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e),
    });
  }
}
