/** Single source for site navigation, shared by the header and footer. */
export type NavItem =
  | { kind: "route"; to: "/clean" | "/fees" | "/privacy" | "/terms"; label: string }
  | { kind: "hash"; href: string; label: string };

export const PRODUCT_NAV: NavItem[] = [
  { kind: "route", to: "/clean", label: "Cleaner" },
  { kind: "hash", href: "/#how", label: "How it works" },
  { kind: "route", to: "/fees", label: "Fees" },
  { kind: "hash", href: "/#faq", label: "FAQ" },
];

export const LEGAL_NAV: NavItem[] = [
  { kind: "route", to: "/privacy", label: "Privacy Policy" },
  { kind: "route", to: "/terms", label: "Terms of Use" },
];
