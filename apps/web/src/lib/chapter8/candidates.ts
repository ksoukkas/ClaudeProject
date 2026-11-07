import { assessParcel as assessLaws } from "@/lib/feasibility/engine";
import type { ParcelFacts, PathwayId } from "@/lib/feasibility/types";
import { isFocusCity } from "@/lib/focus";
import { normalizeApn } from "@/lib/market/csv";
import { noticesForApn } from "@/lib/market/notices";
import { listSource, parcels, type CountyListParcel } from "./county-list";
import { onHousingElementList } from "./he-join";
import { deadlineBadge, scoreCandidate, unknownInput, type DeadlineBadge, type Score } from "./score";

/**
 * One row of the combined Chapter 8 scout list: a parcel from the county's
 * list, in a focus city, with its Cucumber score, deadline badge and the
 * state-law pathways that are not blocked. Server-side only (housing-element
 * join reads a file).
 */
export interface Candidate {
  parcel: CountyListParcel;
  reportId: string;
  score: Score;
  /** No sourced Chapter 8 deadline exists for this list, so the badge reads "none". */
  deadline: DeadlineBadge;
  /** What is known about timing: the list's auction date and that it has passed. */
  deadlineNote: string;
  /** Pathways with no failing test and at least one passing test. */
  lawsWithEvidence: PathwayId[];
  /** Pathways with no failing test but nothing resolved yet. */
  lawsUnresolved: PathwayId[];
  yearsDelinquent: number | null;
}

export const COUNTY_REPORT_PREFIX = "tax-";

/** The county list says what it says; everything else is unknown and the report says so. */
export function countyParcelToFacts(p: CountyListParcel): ParcelFacts {
  const vacant = p.propertyType === "unimproved";
  // Real join: is this APN in the cached HCD Surplus Land Act notices? The cached
  // OC subset is complete for the fetch date, so no match means no notice.
  const notices = noticesForApn(normalizeApn(p.apn));
  return {
    id: `${COUNTY_REPORT_PREFIX}${p.apn}`,
    label: `Tax-defaulted parcel ${p.apn}`,
    synthetic: false,
    city: p.city,
    apn: p.apn,
    lotSqft: null,
    zoning: [],
    existingUse: {
      sourceId: "octtc-tax-auction",
      value: vacant ? "Unimproved (vacant land) per the county list" : "Improved (has a building) per the county list",
    },
    vacant: { sourceId: "octtc-tax-auction", value: vacant ? "yes" : "no", detail: p.propertyType },
    buildingCoveragePct: null,
    hazards: {},
    inHqta: null,
    adjacentIndustrial: null,
    inUrbanizedArea: null,
    historicDistrict: null,
    tenantOccupiedLast3Years: null,
    owner: { type: "unknown", basis: "unknown", detail: "tax-defaulted; owner not in the county list" },
    perimeterUrbanPct: null,
    hoaOrCcrs: null,
    publicSurplusNotice: {
      sourceId: "hcd-surplus-notices",
      value: notices.length ? "yes" : "no",
      detail: notices.length
        ? `matches notice ${notices[0].parentCase || notices[0].id}`
        : "no Surplus Land Act notice with this APN in the cached OC list",
    },
    yearBuilt: null,
    localCode: null,
    plan: { homes: null, affordability: "unknown" },
  };
}

export function buildCandidate(p: CountyListParcel, today: Date): Candidate {
  const input = unknownInput();
  const vacant = p.propertyType === "unimproved";
  // Known from the county list: vacant land scores as such; a building means occupants are unknown.
  input.vacantNoOccupants = vacant ? true : null;
  input.vacantOrLightRehab = vacant ? true : null;
  // Known from the cached SCAG layer by APN, unknown where the layer has no records for the city.
  input.onHousingElementList = onHousingElementList(p.apn, p.city);

  const score = scoreCandidate(input);
  // The list's auction date is not a Chapter 8 request deadline, so no deadline is claimed.
  const deadline = deadlineBadge(null, today);
  const auctionPassed = listSource.auctionDate
    ? new Date(`${listSource.auctionDate}T17:00:00`) <= today
    : false;
  const deadlineNote = listSource.auctionDate
    ? `List published for the ${listSource.auctionDate} auction${auctionPassed ? ", which has passed" : ""}. Ask the tax collector for the Chapter 8 cutoff.`
    : "Ask the tax collector for the Chapter 8 cutoff.";

  const report = assessLaws(countyParcelToFacts(p), today);
  const open = report.pathways.filter((x) => x.status === "open");
  const hasPass = (x: (typeof open)[number]) => x.tests.some((t) => t.verdict === "pass");

  const defaulted = p.taxDefaultedOn ? parseInt(p.taxDefaultedOn.slice(0, 4), 10) : NaN;
  const yearsDelinquent = Number.isFinite(defaulted) ? Math.max(0, today.getFullYear() - defaulted) : null;

  return {
    parcel: p,
    reportId: `${COUNTY_REPORT_PREFIX}${p.apn}`,
    score,
    deadline,
    deadlineNote,
    lawsWithEvidence: open.filter(hasPass).map((x) => x.id),
    lawsUnresolved: open.filter((x) => !hasPass(x)).map((x) => x.id),
    yearsDelinquent,
  };
}

/** Focus-city parcels from the county list, highest score first. */
export function listCandidates(today: Date, opts: { city?: string | null } = {}): Candidate[] {
  return parcels
    .filter((p) => isFocusCity(p.city))
    .filter((p) => !opts.city || p.city.toLowerCase() === opts.city.toLowerCase())
    .map((p) => buildCandidate(p, today))
    .sort((a, b) => b.score.total - a.score.total || a.parcel.minimumBid - b.parcel.minimumBid);
}

export function findCountyParcel(apn: string): CountyListParcel | null {
  return parcels.find((p) => p.apn === apn) ?? null;
}
