/**
 * Geographic focus for the prototype. Framework-free so every module (scout,
 * filters, market, reports) can import it.
 *
 * Decision on 2026-11-07: hyperfocus on three Orange County cities where the
 * team can do one thing well before scaling to all 34. Everything else in the
 * cached public data is kept but hidden by default; pass `allCities: true` to
 * the listing functions to see it.
 */
export const FOCUS_CITIES = ["Santa Ana", "Stanton", "Anaheim"] as const;

export type FocusCity = (typeof FOCUS_CITIES)[number];

const LOWER = FOCUS_CITIES.map((c) => c.toLowerCase());

/** True when a city name, or an agency name such as "City of Stanton", is one of the focus cities. */
export function isFocusCity(nameOrAgency: string | null | undefined): boolean {
  const t = (nameOrAgency ?? "").trim().toLowerCase();
  if (!t) return false;
  return LOWER.some((c) => t === c || t === `city of ${c}`);
}

/** The canonical focus-city name for a city or agency string, or null. */
export function canonicalFocusCity(nameOrAgency: string | null | undefined): FocusCity | null {
  const t = (nameOrAgency ?? "").trim().toLowerCase();
  if (!t) return null;
  const i = LOWER.findIndex((c) => t === c || t === `city of ${c}`);
  return i >= 0 ? FOCUS_CITIES[i] : null;
}

export const FOCUS_LABEL = FOCUS_CITIES.join(", ");
