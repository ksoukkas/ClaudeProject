import { categorizeZoningText } from "@/lib/feasibility/helpers";
import type { ParcelFacts } from "@/lib/feasibility/types";
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

/** All cached OC notices, Active first, then most recent due date first. */
export function listNotices(opts: { activeOnly?: boolean } = {}): SurplusNotice[] {
  const kept = opts.activeOnly ? FILE.notices.filter((n) => n.status === "Active") : FILE.notices;
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
 * and the report says so. The owner is the disposing public agency.
 */
export function noticeToParcelFacts(n: SurplusNotice): ParcelFacts {
  const zoningText = n.generalPlanZoning;
  const use = n.existingUse;
  const vacant: ParcelFacts["vacant"] = use
    ? {
        sourceId: SOURCE_ID,
        value: /vacant|undeveloped|unimproved/i.test(use) ? "yes" : "no",
        detail: use,
      }
    : null;
  return {
    id: n.id,
    label: `Surplus notice ${n.parentCase || n.id}: ${n.address || "address not given"}`,
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
      basis: "confirmed",
      sourceId: SOURCE_ID,
      detail: `${n.agencyType ? `${n.agencyType}, ` : ""}${n.agency} (the disposing agency named in the notice)`,
    },
    perimeterUrbanPct: null,
    hoaOrCcrs: null,
    publicSurplusNotice: { sourceId: SOURCE_ID, value: "yes", detail: `status ${n.status}` },
    yearBuilt: null,
    localCode: null,
    plan: { homes: null, affordability: "unknown" },
  };
}
