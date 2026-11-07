/**
 * Site-wide configuration. Keep this file free of framework imports so it can
 * be shared with other clients later.
 */
export const site = {
  name: "Cucumber",
  tagline: "Land intelligence for affordable housing.",
  nav: [
    { href: "/chapter8", label: "Chapter 8" },
    { href: "/market", label: "Pipeline" },
    { href: "/", label: "Scout" },
    { href: "/saved", label: "Saved sites" },
  ],
} as const;

export type NavItem = (typeof site.nav)[number];
