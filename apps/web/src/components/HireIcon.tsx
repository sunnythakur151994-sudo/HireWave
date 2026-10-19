import type { ReactNode, SVGProps } from "react";

export type HireIconName =
  | "activity" | "dashboard" | "jobs" | "candidates" | "plugins" | "outreach" | "reports" | "settings" | "help"
  | "search" | "bell" | "moon" | "sun" | "chevron" | "arrow" | "plus" | "check" | "calendar" | "clock"
  | "mail" | "filter" | "sort" | "list" | "grid" | "logout" | "menu" | "close" | "phone" | "shield"
  | "briefcase" | "sparkle" | "upload" | "file" | "crown" | "copy" | "message" | "users";

const iconPaths: Record<HireIconName, ReactNode> = {
  activity: <><path d="M2 12h4l3-8 5 16 3-8h5"/></>,
  dashboard: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></>,
  jobs: <><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></>,
  candidates: <><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2z"/></>,
  plugins: <><path d="M10 2h4v5h2a3 3 0 0 1 3 3v2h3v4h-3v3a3 3 0 0 1-3 3h-3v-4H9v4H6a3 3 0 0 1-3-3v-3h4v-4H3v-2a3 3 0 0 1 3-3h4z"/></>,
  outreach: <><path d="M3 11 21 3l-7 18-3-8zM11 13l10-10"/></>,
  reports: <><path d="M4 21V3h11l5 5v13zM15 3v5h5M8 17v-5M12 17V9M16 17v-3"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M10 2h4l.5 3 2 1 2.6-1.5 2.4 3.5-2.2 2 .1 2.5 2.1 2-2.4 3.5-2.6-1.5-2 1-.5 3h-4l-.5-3-2-1-2.6 1.5-2.4-3.5 2.2-2L4.6 11 2.5 9l2.4-3.5L7.5 7l2-1z"/></>,
  help: <><circle cx="12" cy="12" r="10"/><path d="M9.2 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4M12 18h.01"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
  moon: <><path d="M20 15.5A9 9 0 0 1 8.5 4 9 9 0 1 0 20 15.5Z"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4 12H2m20 0h-2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></>,
  chevron: <><path d="m6 9 6 6 6-6"/></>,
  arrow: <><path d="M4 12h16m-6-6 6 6-6 6"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  check: <><path d="m4 12 5 5L20 6"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/></>,
  mail: <><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></>,
  filter: <><path d="M2 5h20l-8 9v6l-4-2v-4z"/></>,
  sort: <><path d="M8 3v18m-4-4 4 4 4-4M16 21V3m-4 4 4-4 4 4"/></>,
  list: <><path d="M9 5h12M9 12h12M9 19h12M3 5h1M3 12h1M3 19h1"/></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></>,
  menu: <><path d="M3 6h18M3 12h18M3 18h18"/></>,
  close: <><path d="m5 5 14 14M19 5 5 19"/></>,
  phone: <><path d="M7 3h3l2 5-2 2c1 2 3 4 5 5l2-2 4 2v4c0 2-2 3-4 2C9 18 4 13 3 7c-.3-2 1-4 4-4z"/></>,
  shield: <><path d="M12 2 4 6v6c0 6 5 9 8 10 3-1 8-4 8-10V6zM9 12l2 2 4-4"/></>,
  briefcase: <><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M2 12h20"/></>,
  sparkle: <><path d="m12 2 2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z"/></>,
  upload: <><path d="M12 16V3m-5 5 5-5 5 5M4 17v4h16v-4"/></>,
  file: <><path d="M4 3h11l5 5v13H4zM15 3v5h5M8 13h8M8 17h8"/></>,
  crown: <><path d="m2 7 5 5 5-8 5 8 5-5-2 12H4z"/></>,
  copy: <><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></>,
  message: <><path d="M4 4h16v13H8l-4 4zM8 9h8M8 13h5"/></>,
  users: <><circle cx="9" cy="8" r="4"/><path d="M2 21v-2a7 7 0 0 1 14 0v2M17 5a4 4 0 0 1 0 7M18 15a6 6 0 0 1 4 6"/></>,
};

export function HireIcon({ name, size = 20, ...props }: {name: HireIconName; size?: number} & Omit<SVGProps<SVGSVGElement>,"name">) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{iconPaths[name]}</svg>;
}
