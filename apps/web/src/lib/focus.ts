/**
 * Geographic scope for the prototype: all of Orange County. Framework-free so
 * every module (scout, reports, market) can import it.
 *
 * The 34 incorporated cities come from lanes/2-clear-it/data/oc-cities.json
 * (checked 2026-11-06). "Unincorporated Orange County" is how the county's
 * tax-defaulted list labels parcels outside any city.
 */
export const FOCUS_CITIES = [
  "Aliso Viejo",
  "Anaheim",
  "Brea",
  "Buena Park",
  "Costa Mesa",
  "Cypress",
  "Dana Point",
  "Fountain Valley",
  "Fullerton",
  "Garden Grove",
  "Huntington Beach",
  "Irvine",
  "La Habra",
  "La Palma",
  "Laguna Beach",
  "Laguna Hills",
  "Laguna Niguel",
  "Laguna Woods",
  "Lake Forest",
  "Los Alamitos",
  "Mission Viejo",
  "Newport Beach",
  "Orange",
  "Placentia",
  "Rancho Santa Margarita",
  "San Clemente",
  "San Juan Capistrano",
  "Santa Ana",
  "Seal Beach",
  "Stanton",
  "Tustin",
  "Villa Park",
  "Westminster",
  "Yorba Linda",
  "Unincorporated Orange County",
] as const;

export type FocusCity = (typeof FOCUS_CITIES)[number];

const LOWER = FOCUS_CITIES.map((c) => c.toLowerCase());

/** True when a city name, or an agency name such as "City of Stanton", is an Orange County jurisdiction. */
export function isFocusCity(nameOrAgency: string | null | undefined): boolean {
  return canonicalFocusCity(nameOrAgency) !== null;
}

/** The canonical jurisdiction name for a city or agency string, or null. */
export function canonicalFocusCity(nameOrAgency: string | null | undefined): FocusCity | null {
  const t = (nameOrAgency ?? "").trim().toLowerCase();
  if (!t) return null;
  if (t === "county of orange" || t === "orange county" || t === "unincorporated") {
    return "Unincorporated Orange County";
  }
  const i = LOWER.findIndex((c) => t === c || t === `city of ${c}`);
  return i >= 0 ? FOCUS_CITIES[i] : null;
}

export const FOCUS_LABEL = "Orange County";
