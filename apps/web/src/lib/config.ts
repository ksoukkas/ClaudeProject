/**
 * Site-wide configuration. Keep this file free of framework imports so it can
 * be shared with other clients later.
 */
export const site = {
  name: "Siteline",
  tagline: "Find the land. See the possibility.",
  nav: [
    { href: "/", label: "Scout" },
    { href: "/matchmaking", label: "Matchmaking" },
    { href: "/saved", label: "Saved sites" },
  ],
} as const;

export type NavItem = (typeof site.nav)[number];
