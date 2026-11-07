/**
 * Site-wide configuration. Keep this file free of framework imports so it can
 * be shared with other clients later.
 */
export const site = {
  name: "Siteline",
  tagline: "Find land where affordable housing could legally go.",
  nav: [
    { href: "/", label: "Home" },
    { href: "/search", label: "Search" },
    { href: "/results", label: "Results" },
    { href: "/about", label: "About" },
  ],
} as const;

export type NavItem = (typeof site.nav)[number];
