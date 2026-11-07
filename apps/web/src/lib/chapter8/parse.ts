import { FOCUS_CITIES } from "@/lib/focus";
import { csvToObjects, normalizeApn } from "@/lib/market/csv";
import type { Chapter8Status, TaxDefaultedParcel } from "./types";

const APN_KEYS = ["apn", "parcel", "parcel number", "assessor parcel number", "assessment no", "assessment number", "ain"];
const CITY_KEYS = ["city", "situs city", "tax rate area city", "community"];
const SITUS_KEYS = ["situs", "situs address", "address", "site address", "property address", "location"];
const USE_KEYS = ["use", "land use", "use code", "property type", "description", "improvement"];
const DEFAULT_YEAR_KEYS = ["default year", "year defaulted", "default date", "year of default", "tax default year"];
const MIN_BID_KEYS = ["min bid", "minimum bid", "opening bid", "starting bid"];
const AUCTION_KEYS = ["auction date", "sale date", "auction", "sale"];
const STATUS_KEYS = ["status", "auction status", "sale status"];
const LIST_DATE_KEYS = ["list date", "as of", "published", "notice date"];

function pick(row: Record<string, string>, keys: string[], used: Set<string>): string | null {
  for (const k of Object.keys(row)) {
    if (keys.includes(k.toLowerCase().trim())) {
      used.add(k);
      return row[k] || null;
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
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** Same privacy rule as the notices: a use that reads as a home gets its address withheld. */
export function readsAsHome(use: string | null): boolean {
  if (!use) return false;
  const own = use.replace(/(bordered by|between|adjacent to|next to|near|surrounded by|across)[^.;|]*/gi, "");
  if (/occupied/i.test(own) && !/unoccupied/i.test(own)) return true;
  return (
    /resid|dwelling|house|home|apartment|mobile\s*home|sfr|condo/i.test(own) &&
    !/vacant|unoccupied|undeveloped|unimproved|former|land only/i.test(own)
  );
}

function toStatus(s: string | null, auctionDate: string | null): Chapter8Status {
  const t = (s ?? "").toLowerCase();
  if (/redeem|sold|withdrawn|removed|cancel/.test(t)) return "redeemed-or-sold";
  if (/power to sell|power-to-sell|pts/.test(t)) return "power-to-sell";
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

/** True when the row's city is one of the focus cities (case-insensitive). */
export function inFocusCity(p: TaxDefaultedParcel): boolean {
  const c = (p.city ?? "").trim().toLowerCase();
  return FOCUS_CITIES.some((f) => f.toLowerCase() === c);
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
