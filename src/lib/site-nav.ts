/** Single source for site navigation, shared by the header and footer. */
export type NavItem =
  | { kind: "route"; to: "/clean" | "/fees" | "/stats" | "/privacy" | "/terms"; label: string }
  | { kind: "hash"; href: string; label: string };

export const PRODUCT_NAV: NavItem[] = [
  { kind: "route", to: "/clean", label: "Cleaner" },
  { kind: "hash", href: "/#how", label: "How it works" },
  { kind: "route", to: "/fees", label: "Fees" },
  { kind: "hash", href: "/#faq", label: "FAQ" },
];

/** Footer only: the header stays focused on the cleaner. */
export const FOOTER_PRODUCT_NAV: NavItem[] = [
  ...PRODUCT_NAV,
  { kind: "route", to: "/stats", label: "Stats" },
];

export const LEGAL_NAV: NavItem[] = [
  { kind: "route", to: "/privacy", label: "Privacy Policy" },
  { kind: "route", to: "/terms", label: "Terms of Use" },
];
