import { supabase } from "./supabase";

const SESSION_STORAGE_KEY = "dzair-store-attribution-session-id";

function createSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return null;
}

export function getAttributionSessionId(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY)?.trim();
    if (existing) return existing;

    const created = createSessionId();
    if (!created) return null;

    window.sessionStorage.setItem(SESSION_STORAGE_KEY, created);
    return created;
  } catch {
    return null;
  }
}

export async function recordStoreAttribution({
  storeId,
  sessionId,
  landingProductId,
}: {
  storeId: string;
  sessionId: string | null;
  landingProductId?: string | null;
}) {
  if (!sessionId || typeof window === "undefined") return false;

  const params = new URLSearchParams(window.location.search);

  try {
    const { error } = await supabase.rpc("record_store_attribution", {
      p_store_id: storeId,
      p_session_id: sessionId,
      p_utm_source: params.get("utm_source"),
      p_utm_medium: params.get("utm_medium"),
      p_utm_campaign: params.get("utm_campaign"),
      p_utm_content: params.get("utm_content"),
      p_utm_term: params.get("utm_term"),
      p_fbclid: params.get("fbclid"),
      p_landing_product_id: landingProductId || null,
      p_landing_page: window.location.pathname,
    });

    if (error) {
      console.warn("[attribution] record failed", error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[attribution] record failed", error);
    return false;
  }
}
