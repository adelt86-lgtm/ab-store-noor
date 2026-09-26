import { supabase } from "./supabase";

export type ShipCarrier = "yalidine" | "zr_express";

export async function shipOrderViaEngine(
  orderId: string,
  carrier: ShipCarrier = "yalidine"
): Promise<{ ok: boolean; tracking_number?: string; message?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke("ship-order", {
    body: { order_id: orderId, carrier },
  });
  if (error) {
    return { ok: false, error: error.message, message: "تعذّر الاتصال بمحرك الشحن" };
  }
  if (!data?.ok) {
    return {
      ok: false,
      error: data?.error || "failed",
      message: data?.message || "فشل إنشاء الطرد — استخدم تصدير CSV",
    };
  }
  return {
    ok: true,
    tracking_number: data.tracking_number,
  };
}
