import type { SVGProps } from "react";

export type SocialPlatform = "Facebook" | "Instagram" | "Telegram" | "TikTok";

export function SocialIcon({ platform, ...props }: { platform: SocialPlatform } & SVGProps<SVGSVGElement>) {
  const common = { viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", className: `social-icon-${platform.toLowerCase()}`, ...props };
  if (platform === "Facebook") return <svg {...common}><path d="M14 8h3V4.7c-.52-.07-1.72-.17-3.27-.17-3.24 0-5.46 1.98-5.46 5.63V13H5.5v3.7h2.77V24h3.4v-7.3h2.82l.45-3.7h-3.27v-2.4c0-1.07.3-1.8 1.86-1.8H14V8Z" fill="currentColor"/></svg>;
  if (platform === "Instagram") return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="2"/><circle cx="17.4" cy="6.7" r="1.1" fill="currentColor"/></svg>;
  if (platform === "Telegram") return <svg {...common}><path d="m21.3 4.2-3.05 14.38c-.23 1.02-.84 1.27-1.7.8l-4.68-3.45-2.26 2.18c-.25.25-.46.46-.94.46l.34-4.77 8.69-7.85c.38-.34-.08-.53-.59-.19L6.37 12.2 1.77 10.76c-1-.31-1.02-1-.21-1.48L19.55 2.1c.83-.31 1.55.19 1.75 2.1Z" fill="currentColor"/></svg>;
  return <svg {...common}><path d="M14.2 3c.2 1.7 1.2 2.7 2.9 2.9v3.1a7.4 7.4 0 0 1-2.9-.6v6.2a5.3 5.3 0 1 1-4.6-5.2v3.2a2.2 2.2 0 1 0 1.4 2v-11h3.2Z" fill="currentColor"/></svg>;
}
