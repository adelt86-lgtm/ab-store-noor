/** Dzair Store — thin line icons, bronze accent on active detail */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number; className?: string };

const base = (size = 22): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
});

export function IconCart({ size = 22, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M6.2 7.2h12.4l-1.15 7.4a1.4 1.4 0 0 1-1.38 1.18H8.7a1.4 1.4 0 0 1-1.38-1.16L6.2 7.2z" />
      <path d="M6.2 7.2 5.2 4.4H3.2" />
      <circle cx="9.2" cy="18.6" r="1.15" />
      <circle cx="15.6" cy="18.6" r="1.15" fill="#B8894A" stroke="none" />
    </svg>
  );
}

export function IconChat({ size = 22, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M6.2 6.4h11.2a1.8 1.8 0 0 1 1.8 1.8v5.4a1.8 1.8 0 0 1-1.8 1.8h-5.4L8.2 18.6v-3.2H6.2a1.8 1.8 0 0 1-1.8-1.8V8.2a1.8 1.8 0 0 1 1.8-1.8z" />
      <circle cx="9.1" cy="11.2" r=".55" fill="currentColor" stroke="none" />
      <circle cx="12" cy="11.2" r=".55" fill="currentColor" stroke="none" />
      <circle cx="14.9" cy="11.2" r=".55" fill="#B8894A" stroke="none" />
    </svg>
  );
}

export function IconTruck({ size = 22, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M3.4 8.2h9.2v6.6H3.4z" />
      <path d="M12.6 10.4h3.4l2.8 2.6v1.8h-6.2" />
      <circle cx="6.6" cy="17.2" r="1.15" />
      <circle cx="16.2" cy="17.2" r="1.15" fill="#B8894A" stroke="none" />
    </svg>
  );
}

export function IconPrint({ size = 22, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M8 4.2h8v3.4H8z" />
      <path d="M6.2 8.6h11.6a1.6 1.6 0 0 1 1.6 1.6v4.2h-2.4v4.2H7.2v-4.2H4.6v-4.2a1.6 1.6 0 0 1 1.6-1.6z" />
      <path d="M8.4 15.6h7.2" stroke="#B8894A" />
    </svg>
  );
}

export function IconStore({ size = 22, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M4.6 10.4 12 5.2l7.4 5.2" />
      <path d="M6.6 10.2V19h10.8v-8.8" />
      <path d="M10.4 19v-3.6h3.2V19" />
      <path d="M4.2 10.4h15.6" stroke="#B8894A" />
    </svg>
  );
}

export function IconCheck({ size = 22, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="12" cy="12" r="7.4" />
      <path d="M8.6 12.2 11 14.5 15.6 9.6" stroke="#B8894A" />
    </svg>
  );
}

export function IconQr({ size = 22, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="4.6" y="4.6" width="5.2" height="5.2" rx=".4" />
      <rect x="14.2" y="4.6" width="5.2" height="5.2" rx=".4" />
      <rect x="4.6" y="14.2" width="5.2" height="5.2" rx=".4" />
      <path d="M14.2 14.2h2.2v2.2h-2.2zM17.6 14.2h1.8v4.6h-2.6M14.2 17.8h2" stroke="#B8894A" />
    </svg>
  );
}

export function IconPin({ size = 22, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M12 20.4s5.4-4.7 5.4-9.1a5.4 5.4 0 1 0-10.8 0c0 4.4 5.4 9.1 5.4 9.1z" />
      <circle cx="12" cy="11.2" r="1.7" fill="#B8894A" stroke="none" />
    </svg>
  );
}

export function IconBox({ size = 22, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M4.5 8.2 12 4.8l7.5 3.4v7.6L12 19.2 4.5 15.8z" />
      <path d="M12 11.2v8M4.7 8.4 12 11.2l7.3-2.8" stroke="#B8894A" />
    </svg>
  );
}

export function IconPlus({ size = 22, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M12 6.5v11M6.5 12h11" stroke="#B8894A" />
    </svg>
  );
}

export function IconBell({ size = 22, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M7 16.2h10l-1.1-1.6V11a3.9 3.9 0 0 0-7.8 0v3.6z" />
      <path d="M10.2 16.4a1.8 1.8 0 0 0 3.6 0" stroke="#B8894A" />
    </svg>
  );
}

export function IconUser({ size = 22, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="12" cy="9" r="3" />
      <path d="M6.2 18.4c1.2-2.6 3.2-3.8 5.8-3.8s4.6 1.2 5.8 3.8" stroke="#B8894A" />
    </svg>
  );
}

export function IconSearch({ size = 22, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="11" cy="11" r="5.2" />
      <path d="M15 15.2 19 19" stroke="#B8894A" />
    </svg>
  );
}

export function IconGear({ size = 22, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="12" cy="12" r="2.4" />
      <path d="M12 4.6v2.1M12 17.3v2.1M4.6 12h2.1M17.3 12h2.1M6.8 6.8l1.5 1.5M15.7 15.7l1.5 1.5M17.2 6.8l-1.5 1.5M8.3 15.7l-1.5 1.5" stroke="#B8894A" />
    </svg>
  );
}

export const DzairIcons = {
  cart: IconCart,
  chat: IconChat,
  truck: IconTruck,
  print: IconPrint,
  store: IconStore,
  check: IconCheck,
  qr: IconQr,
  pin: IconPin,
  box: IconBox,
  plus: IconPlus,
  bell: IconBell,
  user: IconUser,
  search: IconSearch,
  gear: IconGear,
};
