import { csvToObjects, normalizeApn } from "./csv";
import type { MarketSignal, UploadedListing } from "./types";

/** Header names we recognise, case-insensitive. Anything else lands in `extra`. */
const APN_KEYS = ["apn", "parcel", "parcel number", "assessor parcel number", "ain"];
const ADDRESS_KEYS = ["address", "site address", "street address", "property address"];
const CITY_KEYS = ["city"];
const DATE_KEYS = ["listed", "listed date", "list date", "date listed", "listing date"];
const SOURCE_KEYS = ["source", "mls", "broker", "listing source"];

function pick(row: Record<string, string>, keys: string[]): [string | null, string | null] {
  for (const k of Object.keys(row)) {
    if (keys.includes(k.toLowerCase())) return [row[k] || null, k];
  }
  return [null, null];
}

/**
 * Parse a CSV the user pasted from their own broker or MLS export.
 * The app never fetches listings; this is the only way listing data gets in.
 */
export function parseUploadedListings(csvText: string): UploadedListing[] {
  return csvToObjects(csvText).map((row) => {
    const used = new Set<string>();
    const take = (keys: string[]) => {
      const [v, k] = pick(row, keys);
      if (k) used.add(k);
      return v;
    };
    const apn = take(APN_KEYS);
    const listing: UploadedListing = {
      apn,
      apnNormalized: normalizeApn(apn),
      address: take(ADDRESS_KEYS),
      city: take(CITY_KEYS),
      listedDate: take(DATE_KEYS),
      source: take(SOURCE_KEYS),
      extra: {},
    };
    for (const k of Object.keys(row)) if (!used.has(k) && row[k]) listing.extra[k] = row[k];
    return listing;
  });
}

export function listingToSignal(l: UploadedListing): MarketSignal {
  return {
    kind: "uploaded-listing",
    apnNormalized: l.apnNormalized,
    label: "Uploaded listing",
    detail:
      ([l.address, l.city].filter(Boolean).join(", ") || "no address given") +
      (l.source ? ` · ${l.source}` : ""),
    status: null,
    date: l.listedDate,
    sourceId: "user-uploaded-listings",
    url: null,
  };
}

/**
 * SYNTHETIC sample for the demo. No real property. APNs are made up and
 * deliberately match the synthetic fixture parcels and nothing else.
 */
export const SYNTHETIC_LISTINGS_CSV = `cucumber_id,apn,address,city,listed,source
synthetic-002,000-000-002,Synthetic parcel 2 (no real address),Anaheim,2026-10-15,SYNTHETIC sample
,000-000-099,Synthetic unmatched listing (no real address),Anaheim,2026-11-01,SYNTHETIC sample
`;
