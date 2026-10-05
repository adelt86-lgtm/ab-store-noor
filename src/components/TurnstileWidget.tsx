import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
    __turnstileLoading?: Promise<void>;
  }
}

export const TURNSTILE_SITE_KEY = String(import.meta.env["VITE_TURNSTILE_SITE_KEY"] || "").trim();

function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (window.__turnstileLoading) return window.__turnstileLoading;
  window.__turnstileLoading = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("turnstile_load_failed"));
    document.head.appendChild(s);
  });
  return window.__turnstileLoading;
}

/** Renders a Cloudflare Turnstile widget. `resetKey` changes -> widget resets (use after a failed submit). */
export function TurnstileWidget({
  onToken,
  language = "ar",
  resetKey = 0,
}: {
  onToken: (token: string | null) => void;
  language?: "ar" | "fr";
  resetKey?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const idRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !ref.current) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        idRef.current = window.turnstile.render(ref.current, {
          sitekey: TURNSTILE_SITE_KEY,
          language: language === "fr" ? "fr" : "ar",
          theme: "light",
          callback: (t: string) => onToken(t),
          "expired-callback": () => onToken(null),
          "error-callback": () => onToken(null),
        });
      })
      .catch(() => onToken(null));
    return () => {
      cancelled = true;
      try {
        if (idRef.current) window.turnstile?.remove(idRef.current);
      } catch {
        /* ignore */
      }
      idRef.current = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  useEffect(() => {
    if (resetKey > 0 && idRef.current) {
      try { window.turnstile?.reset(idRef.current); } catch { /* ignore */ }
      onToken(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={ref} className="om-captcha" style={{ display: "flex", justifyContent: "center", margin: "8px 0" }} />;
}
