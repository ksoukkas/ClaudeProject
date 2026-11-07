import { categorizeZoningText } from "@/lib/feasibility/helpers";
import type { ParcelFacts } from "@/lib/feasibility/types";
import { isFocusCity } from "@/lib/focus";
import { normalizeApn } from "./csv";
import noticeFile from "./data/surplus-notices-oc.json";
import type { MarketSignal, NoticeFile, SurplusNotice } from "./types";

const FILE = noticeFile as unknown as NoticeFile;
const SOURCE_ID = "hcd-surplus-notices";
/** 1 acre = 43,560 square feet (standard conversion). */
const SQFT_PER_ACRE = 43560;

export function noticeProvenance() {
  return FILE.provenance;
}

/** A notice is in focus when its city, or the disposing agency, is a focus city. */
export function noticeInFocus(n: SurplusNotice): boolean {
  return isFocusCity(n.city) || isFocusCity(n.agency);
}

/** Count of every cached OC notice, regardless of focus. */
export function totalCachedNotices(): number {
  return FILE.notices.length;
}

/**
 * Cached notices, Active first, then most recent due date first.
 * Focus cities only by default; `allCities: true` returns every OC row.
 */
export function listNotices(
  opts: { activeOnly?: boolean; allCities?: boolean } = {},
): SurplusNotice[] {
  let kept = opts.allCities ? FILE.notices : FILE.notices.filter(noticeInFocus);
  if (opts.activeOnly) kept = kept.filter((n) => n.status === "Active");
  return [...kept].sort((a, b) => {
    if (a.status !== b.status) return a.status === "Active" ? -1 : 1;
    return (b.dueDate ?? "").localeCompare(a.dueDate ?? "");
  });
}

export function getNotice(id: string): SurplusNotice | null {
  return FILE.notices.find((n) => n.id === id) ?? null;
}

/** Notices whose APN matches, by normalised digits. Free-text APNs never match. */
export function noticesForApn(apnNormalized: string | null): SurplusNotice[] {
  if (!apnNormalized) return [];
  return FILE.notices.filter((n) => normalizeApn(n.apnRaw) === apnNormalized);
}

export function noticeToSignal(n: SurplusNotice): MarketSignal {
  return {
    kind: "public-notice",
    apnNormalized: normalizeApn(n.apnRaw),
    label: `Surplus Land Act notice ${n.parentCase || n.id}`,
    detail: `${n.agencyType ? `${n.agencyType}: ` : ""}${n.agency}${n.city ? `, ${n.city}` : ""}`,
    status: n.status || null,
    date: n.dueDate,
    sourceId: SOURCE_ID,
    url: n.noticeUrl ?? FILE.provenance.datasetUrl,
  };
}

/**
 * Turn a notice into ParcelFacts so the feasibility engine can screen it.
 * Only what the notice itself says is filled in. Everything else is unknown,
 * and the report says so. The disposing agency is recorded as a proxy public
 * owner: the notice names it, but no deed or Assessor record was checked.
 */
export function noticeToParcelFacts(n: SurplusNotice): ParcelFacts {
  const zoningText = n.generalPlanZoning;
  const use = n.existingUse;
  // Only what the text says, and only when it is unambiguous.
  const t = use.toLowerCase();
  const saysVacant =
    /\b(vacant|undeveloped|unimproved)\b/.test(t) && !/\b(non-?\s?vacant|not vacant)\b/.test(t);
  const saysOccupied =
    /\boccupied\b/.test(t) && !/\bunoccupied\b/.test(t) && !/no current use/.test(t);
  const vacantValue =
    saysVacant && !saysOccupied ? "yes" : saysOccupied && !saysVacant ? "no" : "unknown";
  const vacant: ParcelFacts["vacant"] = use
    ? { sourceId: SOURCE_ID, value: vacantValue, detail: use }
    : null;
  const place = n.addressWithheld ? "address withheld" : n.address || "address not given";
  return {
    id: n.id,
    label: `Surplus notice ${n.parentCase || n.id}: ${place}`,
    synthetic: false,
    city: n.city || n.agency,
    apn: n.apnRaw || null,
    lotSqft: n.sizeAcres !== null ? Math.round(n.sizeAcres * SQFT_PER_ACRE) : null,
    lotSqftSourceId: SOURCE_ID,
    zoning: zoningText
      ? [
          {
            sourceId: SOURCE_ID,
            code: zoningText,
            description: "General plan / zoning text as written in the notice",
            category: categorizeZoningText(zoningText),
          },
        ]
      : [],
    existingUse: use ? { sourceId: SOURCE_ID, value: use } : null,
    vacant,
    buildingCoveragePct: null,
    hazards: {},
    inHqta: null,
    adjacentIndustrial: null,
    inUrbanizedArea: null,
    historicDistrict: null,
    tenantOccupiedLast3Years: null,
    owner: {
      type: "public",
      basis: "proxy",
      sourceId: SOURCE_ID,
      detail: `${n.agencyType ? `${n.agencyType}, ` : ""}${n.agency} filed the notice as the disposing agency; not checked against the deed or Assessor roll`,
    },
    perimeterUrbanPct: null,
    hoaOrCcrs: null,
    publicSurplusNotice: { sourceId: SOURCE_ID, value: "yes", detail: `status ${n.status}` },
    yearBuilt: null,
    localCode: null,
    plan: { homes: null, affordability: "unknown" },
  };
}
