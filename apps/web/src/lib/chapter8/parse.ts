import { isFocusCity } from "@/lib/focus";
import { csvToObjects, normalizeApn } from "@/lib/market/csv";
import type { Chapter8Status, TaxDefaultedParcel } from "./types";

// Keys are in priority order: the first key that matches a column wins.
const APN_KEYS = ["apn", "assessor parcel number", "assessment no", "assessment number", "parcel number", "parcel", "ain"];
const CITY_KEYS = ["situs city", "city", "tax rate area city", "community"];
const SITUS_KEYS = ["situs address", "situs", "site address", "property address", "address"];
const USE_KEYS = ["land use", "use code", "use", "property type", "improvement", "description"];
const DEFAULT_YEAR_KEYS = ["default year", "year defaulted", "year of default", "tax default year", "default date"];
const MIN_BID_KEYS = ["minimum bid", "min bid", "opening bid", "starting bid"];
const AUCTION_KEYS = ["auction date", "sale date", "auction"];
const STATUS_KEYS = ["auction status", "sale status", "status"];
const LIST_DATE_KEYS = ["list date", "as of", "published", "notice date"];

/** Columns that could carry a person's details are never read, whatever they are called. */
const NEVER_READ = /owner|assessee|taxpayer|mail|name|phone|email/i;

function pick(row: Record<string, string>, keys: string[], used: Set<string>): string | null {
  const cols = Object.keys(row).filter((k) => !NEVER_READ.test(k));
  for (const key of keys) {
    const col = cols.find((k) => k.toLowerCase().trim() === key);
    if (col) {
      used.add(col);
      return row[col] || null;
    }
  }
  return null;
}

function toNumber(s: string | null): number | null {
  if (!s) return null;
  const n = parseFloat(s.replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function toYear(s: string | null): number | null {
  if (!s) return null;
  const m = s.match(/(19|20)\d{2}/);
  return m ? parseInt(m[0], 10) : null;
}

function toIsoDate(s: string | null): string | null {
  if (!s) return null;
  const t = s.trim();
  let m = t.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  // Local date parts, so a parsed date never shifts a day across time zones.
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Privacy default: withhold the address unless the use clearly reads as
 * land or a non-residential property. A missing use withholds. Stricter than
 * the notices rule because tax-defaulted lists include lived-in homes.
 */
export function readsAsHome(use: string | null): boolean {
  if (!use) return true;
  const own = use.replace(/(bordered by|between|adjacent to|next to|near|surrounded by|across)[^.;|]*/gi, "");
  const residential =
    /occupied|resid|dwelling|house|home|apartment|duplex|triplex|fourplex|condo|townh|mobile\s*home|sfr|\bunits?\b/i.test(own) &&
    !/unoccupied/i.test(own);
  if (residential) return true;
  const clearlyNotAHome =
    /vacant|undeveloped|unimproved|land only|lot only|parking|commercial|retail|office|industrial|warehouse|church|school|agricultur|open space|right[- ]of[- ]way|sliver|easement|strip/i.test(own);
  return !clearlyNotAHome;
}

function toStatus(s: string | null, auctionDate: string | null): Chapter8Status {
  const t = (s ?? "").toLowerCase();
  // "Unsold" and "not sold" must not read as sold.
  if (/unsold|not sold|re-?offer/.test(t)) return auctionDate ? "scheduled-auction" : "power-to-sell";
  if (/redeem|\bsold\b|withdrawn|removed|cancel/.test(t)) return "redeemed-or-sold";
  if (/power to sell|power-to-sell|\bpts\b/.test(t)) return "power-to-sell";
  if (/auction|scheduled|offered|listed/.test(t) || auctionDate) return "scheduled-auction";
  return "unknown";
}

/**
 * Parse a pasted county list (the Treasurer-Tax Collector's auction spreadsheet
 * or a published notice transcribed to CSV). The app never fetches it; the
 * user downloads it from the county and pastes it here. Owner or assessee
 * columns are dropped on sight.
 */
export function parseTaxDefaultedList(
  csvText: string,
  opts: { sourceId?: string; listDate?: string | null; synthetic?: boolean } = {},
): TaxDefaultedParcel[] {
  const sourceId = opts.sourceId ?? "user-pasted-tax-list";
  return csvToObjects(csvText).map((row, i) => {
    const used = new Set<string>();
    const apn = pick(row, APN_KEYS, used);
    const city = pick(row, CITY_KEYS, used);
    const situsRaw = pick(row, SITUS_KEYS, used);
    const useText = pick(row, USE_KEYS, used);
    const defaultYear = toYear(pick(row, DEFAULT_YEAR_KEYS, used));
    const minBid = toNumber(pick(row, MIN_BID_KEYS, used));
    const auctionDate = toIsoDate(pick(row, AUCTION_KEYS, used));
    const statusText = pick(row, STATUS_KEYS, used);
    const listDate = toIsoDate(pick(row, LIST_DATE_KEYS, used)) ?? opts.listDate ?? null;
    const withheld = readsAsHome(useText);
    const extra: Record<string, string> = {};
    for (const k of Object.keys(row)) {
      if (used.has(k) || !row[k]) continue;
      // Never keep a person's name, even if the county list carries one.
      if (/owner|assessee|name|taxpayer/i.test(k)) continue;
      extra[k] = row[k];
    }
    const listYear = listDate ? parseInt(listDate.slice(0, 4), 10) : null;
    return {
      id: `tax-${String(i + 1).padStart(3, "0")}`,
      synthetic: opts.synthetic ?? false,
      apn,
      apnNormalized: normalizeApn(apn),
      city,
      situs: withheld ? null : situsRaw,
      situsWithheld: withheld && !!situsRaw,
      useText,
      defaultYear,
      yearsDelinquent:
        defaultYear !== null && listYear !== null ? Math.max(0, listYear - defaultYear) : null,
      minBid,
      auctionDate,
      status: toStatus(statusText, auctionDate),
      listDate,
      sourceId,
      extra,
    };
  });
}

/** True when the row's city is one of the focus cities, including "City of X" spellings. */
export function inFocusCity(p: TaxDefaultedParcel): boolean {
  return isFocusCity(p.city);
}

/**
 * SYNTHETIC sample in the shape of a county auction list. No real parcel:
 * APNs are placeholders, bids and years are made up (ASSUMPTION). It exists
 * so the page can be demonstrated before a real list is pasted.
 */
export const SYNTHETIC_TAX_LIST_CSV = `apn,city,situs,use,default year,min bid,auction date,status,list date
SYN-000-001,Santa Ana,SYNTHETIC vacant lot (no real address),Vacant land,2019,12000,2027-03-10,Scheduled,2026-11-01
SYN-000-002,Stanton,SYNTHETIC strip lot (no real address),Commercial land,2018,25000,2027-03-10,Scheduled,2026-11-01
SYN-000-003,Anaheim,SYNTHETIC house (no real address),Single family residence,2020,,,"Power to sell",2026-11-01
SYN-000-004,Santa Ana,SYNTHETIC redeemed lot (no real address),Vacant land,2017,9000,2025-06-25,Redeemed,2026-11-01
`;
