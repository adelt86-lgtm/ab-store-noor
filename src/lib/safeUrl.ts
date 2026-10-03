// URL allow-listing for anything a merchant (or a carrier API) controls and we render in href.
const SOCIAL_HOSTS: Record<string, string[]> = {
  Facebook: ["facebook.com", "www.facebook.com", "m.facebook.com", "fb.com", "www.fb.com", "fb.me"],
  Instagram: ["instagram.com", "www.instagram.com"],
  Telegram: ["t.me", "telegram.me"],
  TikTok: ["tiktok.com", "www.tiktok.com", "vm.tiktok.com"],
};

/** Returns a normalised https URL for the given platform, or null if it is not acceptable. */
export function safeSocialUrl(platform: string, raw: unknown): string | null {
  const value = String(raw ?? "").trim();
  if (!value || value.length > 300) return null;
  try {
    const u = new URL(value);
    if (u.protocol !== "https:") return null;
    if (u.username || u.password) return null;
    const hosts = SOCIAL_HOSTS[platform];
    return hosts && hosts.includes(u.hostname.toLowerCase()) ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Generic https-only URL (e.g. carrier tracking pages). */
export function safeHttpsUrl(raw: unknown): string | null {
  const value = String(raw ?? "").trim();
  if (!value || value.length > 600) return null;
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password ? u.toString() : null;
  } catch {
    return null;
  }
}
