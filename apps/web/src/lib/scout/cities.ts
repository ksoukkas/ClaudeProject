/**
 * The 34 incorporated cities of Orange County, copied from
 * lanes/2-clear-it/data/oc-cities.json. Keep the two lists in sync.
 */
export const OC_CITIES = [
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
] as const;

export type OcCity = (typeof OC_CITIES)[number];

/** Case-insensitive exact match to one of the 34 names, else null. */
export function toOcCity(value: unknown): OcCity | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return OC_CITIES.find((c) => c.toLowerCase() === v) ?? null;
}

/**
 * The SCAG layer stores jurisdictions in upper case (checked 2026-11-07),
 * for example "ANAHEIM" and "GARDEN GROVE".
 */
export function scagJurisdiction(city: OcCity): string {
  return city.toUpperCase();
}
