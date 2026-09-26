import { supabase } from "./supabase";

export type ShipCarrier = "yalidine" | "zr_express";

/**
 * Calls same-origin Vercel API /api/ship-order (no Supabase Edge CLI needed).
 */
export async function shipOrderViaEngine(
  orderId: string,
  carrier: ShipCarrier = "yalidine",
): Promise<{ ok: boolean; tracking_number?: string; message?: string; error?: string }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      return { ok: false, error: "no_auth", message: "سجّل الدخول أولاً" };
    }

    const res = await fetch("/api/ship-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ order_id: orderId, carrier }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        error: data?.error || `http_${res.status}`,
        message: data?.message || data?.error || "فشل الشحن — استخدم تصدير CSV",
      };
    }
    return { ok: true, tracking_number: data.tracking_number };
  } catch (e: any) {
    return {
      ok: false,
      error: e?.message || String(e),
      message: "تعذّر الاتصال بخدمة الشحن",
    };
  }
}
