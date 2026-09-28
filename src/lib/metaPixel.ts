const META_PIXEL_ID = String(import.meta.env["VITE_META_PIXEL_ID"] || "").trim();

type Fbq = ((...args: unknown[]) => void) & { loaded?: boolean; version?: string; queue?: unknown[] };

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

let initialized = false;

export function initMetaPixel() {
  if (initialized || !META_PIXEL_ID || typeof window === "undefined") return false;

  const existing = window.fbq;
  if (existing) {
    existing("init", META_PIXEL_ID);
    existing("track", "PageView");
    initialized = true;
    return true;
  }

  const fbq = ((...args: unknown[]) => {
    fbq.queue = fbq.queue || [];
    fbq.queue.push(args);
  }) as Fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq;
  window._fbq = fbq;
  fbq("init", META_PIXEL_ID);
  fbq("track", "PageView");

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
  initialized = true;
  return true;
}

export function trackMetaEvent(event: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined" || !window.fbq) return;
  if (params) window.fbq("track", event, params);
  else window.fbq("track", event);
}

export function hasMetaPixel() {
  return Boolean(META_PIXEL_ID);
}
