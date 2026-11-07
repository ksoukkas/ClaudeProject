/**
 * Transparent, deterministic ranking. Pure functions, no network, unit-tested.
 *
 * Score (ASSUMPTION, see config.ts):
 *   capacity: up to CAPACITY_POINTS, linear in the units counted toward the
 *             goal, capped at the goal (or NO_GOAL_CAPACITY_CAP with no goal)
 *   transit:  only when the search asks for transit. TRANSIT_POINTS inside a
 *             Caltrans HQTA with existing service, PLANNED_TRANSIT_POINTS when
 *             only an MPO-planned stop matches, 0 otherwise or when unknown.
 * With a unit goal, sites that meet it come first (ASSUMPTION). Ties break on
 * total capacity, then APN, so the order is reproducible.
 */
import { laws, type LawId } from "../sample-data";
import {
  CAPACITY_POINTS,
  ENRICH_COUNT,
  NO_GOAL_CAPACITY_CAP,
  PLANNED_TRANSIT_POINTS,
  RESULT_COUNT,
  TRANSIT_POINTS,
} from "./config";
import type { HousingElementSite, ZoningRecord } from "./retrieve";
import { recordUrl, SCAG_HE_LAYER, SCAG_ZONING_LAYER, scoutSources } from "./sources";
import type {
  Criteria,
  Observation,
  OpenCheck,
  PathwayLead,
  ScoreComponent,
  ScoutCandidate,
  TransitFact,
} from "./types";
import type { OcCity } from "./cities";

const SQ_M_PER_ACRE = 4046.8564224;

export function goalBasis(
  criteria: Criteria,
  site: Pick<HousingElementSite, "lower" | "moderate" | "total">,
): { units: number; label: string } {
  if (criteria.affordability.incomeLevel === "moderate") {
    return { units: site.lower + site.moderate, label: "lower + moderate income capacity" };
  }
  if (criteria.affordability.mentioned || criteria.affordability.incomeLevel === "lower") {
    // ASSUMPTION: "affordable" with no income level = lower-income capacity.
    return { units: site.lower, label: "lower-income capacity" };
  }
  return { units: site.total, label: "total capacity (all income levels)" };
}

function byCapacity(criteria: Criteria) {
  return (a: HousingElementSite, b: HousingElementSite) =>
    goalBasis(criteria, b).units - goalBasis(criteria, a).units ||
    b.total - a.total ||
    a.apn.localeCompare(b.apn);
}

/** The sites worth enriching: highest capacity first. ASSUMPTION: ENRICH_COUNT. */
export function preselect(sites: HousingElementSite[], criteria: Criteria): HousingElementSite[] {
  return [...sites]
    .filter((s) => goalBasis(criteria, s).units > 0)
    .sort(byCapacity(criteria))
    .slice(0, ENRICH_COUNT);
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

export function scoreSite(
  criteria: Criteria,
  site: HousingElementSite,
  transit: Observation<TransitFact>,
): { score: number; parts: ScoreComponent[]; meetsGoal: boolean | null } {
  const basis = goalBasis(criteria, site);
  const cap = criteria.minUnits ?? NO_GOAL_CAPACITY_CAP;
  const capPoints = round1((Math.min(basis.units, cap) / cap) * CAPACITY_POINTS);
  const meetsGoal = criteria.minUnits == null ? null : basis.units >= criteria.minUnits;
  const parts: ScoreComponent[] = [
    {
      label: "Capacity",
      points: capPoints,
      max: CAPACITY_POINTS,
      why:
        criteria.minUnits == null
          ? `${fmt(basis.units)} units of ${basis.label}, scaled against 100 units (ASSUMPTION: no goal given).`
          : `${fmt(basis.units)} units of ${basis.label} against your ${criteria.minUnits}-unit goal${
              meetsGoal ? " (meets it)" : " (below it)"
            }.`,
    },
  ];

  if (criteria.nearTransit === true) {
    let points = 0;
    let why: string;
    if (transit.value === "unknown") {
      why = `Transit unknown: ${transit.note}`;
    } else if (transit.value.inHqta && !transit.value.plannedOnly) {
      points = TRANSIT_POINTS;
      why = `Centroid is inside a Caltrans High Quality Transit Area (${transit.value.types.join(", ")}).`;
    } else if (transit.value.inHqta) {
      points = PLANNED_TRANSIT_POINTS;
      why = "Only an MPO-planned major stop matches, not existing service.";
    } else {
      why = "Centroid is not inside any Caltrans High Quality Transit Area.";
    }
    parts.push({ label: "Transit", points, max: TRANSIT_POINTS, why });
  }

  return { score: round1(parts.reduce((s, p) => s + p.points, 0)), parts, meetsGoal };
}

function acresObservation(site: HousingElementSite, zoning: ZoningRecord | null | undefined): Observation<number> {
  if (zoning?.acres) {
    return { value: Math.round(zoning.acres * 100) / 100, sourceId: "scag-zoning", note: "SCAG ACRES field" };
  }
  if (site.areaM2) {
    return {
      value: Math.round((site.areaM2 / SQ_M_PER_ACRE) * 100) / 100,
      sourceId: "scag-he",
      note: "Computed from the mapped polygon area (Shape.STArea, m²); not an assessor lot size",
    };
  }
  return { value: "unknown", sourceId: null, note: "No area in either SCAG layer" };
}

function zoningObservation(zoning: ZoningRecord | null | undefined, checked: boolean): Observation<string> {
  if (!checked) return { value: "unknown", sourceId: null, note: "SCAG zoning layer could not be read" };
  if (!zoning?.codes.length) return { value: "unknown", sourceId: null, note: "No SCAG zoning record for this parcel" };
  return {
    value: zoning.codes.join(" / "),
    sourceId: "scag-zoning",
    note: `Local zoning code as listed by SCAG${zoning.year ? ` (${zoning.year} dataset)` : ""}; confirm with the city`,
  };
}

const PATHWAY_SUMMARY: Record<LawId, string> = {
  SB9: "Lot splits and duplexes on single-family lots",
  SB684_SB1123: "Small-lot subdivisions of up to 10 homes without a hearing",
  AB2011: "Housing on commercial corridors",
  SB4: "Housing on faith and nonprofit-college land",
};

export function pathwayLeads(criteria: Criteria, zoning: Observation<string>): PathwayLead[] {
  const zone = zoning.value === "unknown" ? "unknown" : `"${zoning.value}"`;
  const condition: Record<LawId, string> = {
    SB4: "Applies only if a religious institution or nonprofit college owns the land. Ownership is unknown in these public data.",
    AB2011: `Depends on the parcel being in a qualifying commercial zone and passing the law's site tests. SCAG zone: ${zone}; not checked against the statute.`,
    SB9: `Depends on single-family zoning and the law's exclusions. SCAG zone: ${zone}; not checked.`,
    SB684_SB1123: "Depends on lot size and zoning limits, which differ by bill (see pathways.json). Not checked.",
  };
  const ids: LawId[] = criteria.pathways.length ? criteria.pathways : ["AB2011", "SB4", "SB684_SB1123", "SB9"];
  return ids.map((law) => ({
    law,
    condition: `${PATHWAY_SUMMARY[law]} (summary, pathways.json). ${condition[law]}`,
    sources: laws[law].sources,
  }));
}

export function openChecks(
  criteria: Criteria,
  zoning: Observation<string>,
  transit: Observation<TransitFact>,
): OpenCheck[] {
  const checks: OpenCheck[] = [
    {
      label: "Ownership",
      why: "Unknown. Owner is not in the free public parcel data (lanes/1-find-it/data/DATA-SOURCES.md).",
    },
    {
      label: "Hazards (flood, fire, liquefaction, slope)",
      why: "Unknown. Not checked by this scout. FEMA, CAL FIRE and CGS layers are listed in DATA-SOURCES.md.",
    },
    { label: "Utilities and access", why: "Unknown. No public source checked." },
    {
      label: "Pathway eligibility",
      why: "Unknown. A housing-element listing is not a state-law pathway; each law has its own site tests.",
    },
    {
      label: "Still listed and available",
      why: "Unknown. Inventories can go stale; confirm against the city's adopted housing element (HCD).",
    },
  ];
  if (zoning.value === "unknown") checks.push({ label: "Zoning", why: `Unknown. ${zoning.note}.` });
  if (criteria.nearTransit === true && transit.value === "unknown") {
    checks.push({ label: "Transit", why: `Unknown. ${transit.note}.` });
  }
  if (criteria.ownerHints.length) {
    checks.push({
      label: `Owner type you asked for (${criteria.ownerHints.join(", ")})`,
      why: "Unknown. No public layer used here records owner type, so this site is not confirmed as a match.",
    });
  }
  return checks;
}

export function templateWhy(c: Omit<ScoutCandidate, "why" | "whySource">, criteria: Criteria): string {
  const parts: string[] = [
    `Listed in ${c.city}'s housing element site inventory (SCAG ${c.capacity.year ?? "year unknown"} data) with ${fmt(
      c.goalBasis.units,
    )} units of ${c.goalBasis.label}${
      c.meetsGoal === true ? `, meeting your ${criteria.minUnits}-unit goal` : c.meetsGoal === false ? `, below your ${criteria.minUnits}-unit goal` : ""
    }.`,
  ];
  if (c.transit.value !== "unknown" && criteria.nearTransit !== null) {
    parts.push(
      c.transit.value.inHqta
        ? c.transit.value.plannedOnly
          ? "Only a planned transit stop is nearby."
          : "Inside a Caltrans high quality transit area."
        : "Not inside a Caltrans high quality transit area.",
    );
  }
  parts.push("Owner, hazards and utilities are unknown.");
  return parts.join(" ");
}

export type Enrichment = {
  /** null = the HQTA service was not read (failed or not needed). */
  transit: Map<string, TransitFact> | null;
  transitNote: string;
  /** null = the zoning service could not be read. */
  zoning: Map<string, ZoningRecord> | null;
};

/** Build, score and rank candidates. Returns at most RESULT_COUNT. */
export function rankCandidates(
  city: OcCity,
  sites: HousingElementSite[],
  criteria: Criteria,
  enrichment: Enrichment,
): ScoutCandidate[] {
  const built = sites.map((site) => {
    const tf = enrichment.transit?.get(site.pid24);
    const transit: Observation<TransitFact> = tf
      ? { value: tf, sourceId: "caltrans-hqta", note: "Point-in-polygon test of the parcel centroid" }
      : { value: "unknown", sourceId: null, note: enrichment.transitNote };
    const zoningRec = enrichment.zoning?.get(site.pid24);
    const zoning = zoningObservation(zoningRec, enrichment.zoning !== null);
    const { score, parts, meetsGoal } = scoreSite(criteria, site, transit);
    const links = [
      { label: "SCAG housing element record", href: recordUrl(SCAG_HE_LAYER, site.pid24) },
    ];
    if (zoning.value !== "unknown") {
      links.push({ label: "SCAG zoning record", href: recordUrl(SCAG_ZONING_LAYER, site.pid24) });
    }
    if (transit.value !== "unknown") {
      links.push({ label: "Caltrans HQTA layer", href: scoutSources["caltrans-hqta"].url });
    }
    const base: Omit<ScoutCandidate, "why" | "whySource"> = {
      id: `he-${site.pid24}`,
      rank: 0,
      pid24: site.pid24,
      apn: site.apn,
      address: null,
      city,
      centroid: site.centroid,
      capacity: {
        lower: site.lower,
        moderate: site.moderate,
        aboveModerate: site.aboveModerate,
        total: site.total,
        sourceId: "scag-he",
        year: site.year,
      },
      goalBasis: goalBasis(criteria, site),
      meetsGoal,
      acres: acresObservation(site, zoningRec),
      zoning,
      transit,
      score,
      scoreParts: parts,
      feasibility: "review",
      openChecks: openChecks(criteria, zoning, transit),
      pathwayLeads: pathwayLeads(criteria, zoning),
      links,
    };
    return base;
  });

  // ASSUMPTION (see config.ts scoreWeights): with a unit goal, sites that meet
  // it are listed before sites that don't; score orders within each group.
  const goalRank = (c: { meetsGoal: boolean | null }) => (c.meetsGoal === false ? 1 : 0);
  built.sort(
    (a, b) =>
      goalRank(a) - goalRank(b) ||
      b.score - a.score ||
      b.capacity.total - a.capacity.total ||
      a.apn.localeCompare(b.apn),
  );
  return built.slice(0, RESULT_COUNT).map((c, i) => {
    const ranked = { ...c, rank: i + 1 };
    return { ...ranked, why: templateWhy(ranked, criteria), whySource: "template" as const };
  });
}
