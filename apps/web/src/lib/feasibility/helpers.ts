import { getSource } from "./sources";
import type {
  Conflict,
  HazardKey,
  Observation,
  ParcelFacts,
  Resolver,
  TestResult,
  TriState,
  Verdict,
  ZoningCategory,
} from "./types";

export const RESOLVER_LABELS: Record<Resolver, string> = {
  "city-planning": "Ask the city planning counter",
  "owner-or-title":
    "Confirm ownership and recorded documents (Assessor roll, deed, preliminary title report)",
  "data-layer": "Query or wire a public map layer",
  "site-visit": "Visit or survey the site",
  "project-design": "Decide the project (unit count, affordability mix)",
  statute: "Read the statute and record the test with a source",
};

export const HAZARD_LABELS: Record<HazardKey, string> = {
  veryHighFire: "Very high fire hazard severity zone",
  floodSfha: "Special flood hazard area",
  faultZone: "Earthquake fault zone",
  wetlands: "Wetlands",
  farmland: "Protected farmland",
  liquefaction: "Liquefaction zone",
};

/** Prepositional phrases for sentences: "mapped in an earthquake fault zone", "mapped on wetlands". */
export const HAZARD_PHRASES: Record<HazardKey, string> = {
  veryHighFire: "in a very high fire hazard severity zone",
  floodSfha: "in a special flood hazard area",
  faultZone: "in an earthquake fault zone",
  wetlands: "on wetlands",
  farmland: "on protected farmland",
  liquefaction: "in a liquefaction zone",
};

export function sourceName(id: string): string {
  return getSource(id).name;
}

export function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

export interface Combined {
  value: TriState;
  sourceIds: string[];
  conflict: boolean;
  details: string[];
}

/** Merge observations from several sources. Yes and no together is a conflict, not a vote. */
export function combine(observations: Observation[] | null | undefined): Combined {
  const obs = observations ?? [];
  const sourceIds = obs.map((o) => o.sourceId);
  const details = obs.flatMap((o) => (o.detail ? [o.detail] : []));
  const yes = obs.some((o) => o.value === "yes");
  const no = obs.some((o) => o.value === "no");
  if (yes && no) return { value: "unknown", sourceIds, conflict: true, details };
  if (yes) return { value: "yes", sourceIds, conflict: false, details };
  if (no) return { value: "no", sourceIds, conflict: false, details };
  return { value: "unknown", sourceIds, conflict: false, details };
}

export function single(observation: Observation | null): Combined {
  return combine(observation ? [observation] : []);
}

export function hazard(facts: ParcelFacts, key: HazardKey): Combined {
  return combine(facts.hazards[key]);
}

export function describeCombined(c: Combined, label: string): string {
  if (c.sourceIds.length === 0) return `${label}: no data.`;
  const src = unique(c.sourceIds).map(sourceName).join("; ");
  const detail = c.details.length ? ` (${c.details.join("; ")})` : "";
  if (c.conflict) return `${label}: sources disagree (${src})${detail}.`;
  return `${label}: ${c.value} per ${src}${detail}.`;
}

/** yes passes, no fails. */
export function triVerdict(value: TriState): Verdict {
  if (value === "yes") return "pass";
  if (value === "no") return "fail";
  return "unknown";
}

/** yes fails, no passes. For exclusions. */
export function invertedTriVerdict(value: TriState): Verdict {
  if (value === "yes") return "fail";
  if (value === "no") return "pass";
  return "unknown";
}

export interface ZoningReading {
  category: ZoningCategory;
  categories: ZoningCategory[];
  sourceIds: string[];
  conflict: boolean;
  summary: string;
}

export function readZoning(facts: ParcelFacts): ZoningReading {
  const obs = facts.zoning;
  const sourceIds = obs.map((z) => z.sourceId);
  const categories = unique(obs.map((z) => z.category).filter((c) => c !== "unknown"));
  const conflict = categories.length > 1;
  const category: ZoningCategory = conflict ? "unknown" : (categories[0] ?? "unknown");
  const summary =
    obs.length === 0
      ? "No zoning observation for this parcel."
      : obs
          .map(
            (z) =>
              `${z.code ?? "no code"} (${z.description ?? z.category}) per ${sourceName(z.sourceId)}`,
          )
          .join("; ");
  return { category, categories, sourceIds, conflict, summary };
}

/**
 * Keyword mapping from a source's zoning text to our categories.
 * ASSUMPTION: this is a heuristic. Check it against the source's legend before
 * trusting it, and always show the original code beside the category.
 */
export function categorizeZoningText(text: string): ZoningCategory {
  const t = text.toLowerCase().trim();
  if (!t) return "unknown";
  if (/mixed/.test(t)) return "mixed-use";
  if (/single|one-family|one family/.test(t)) return "single-family";
  if (/multi|apartment|duplex|townhou/.test(t)) return "multifamily";
  if (/commerc|retail|office|business/.test(t)) return "commercial";
  if (/industr|manufactur|warehouse/.test(t)) return "industrial";
  if (/public|institution|civic|school|government/.test(t)) return "public";
  return "other";
}

/** True when the zoning reading cannot carry a verdict: nothing observed, sources disagree, or the code was not recognised. */
export function zoningUndecided(z: ZoningReading): boolean {
  return z.conflict || z.category === "unknown" || z.category === "other";
}

export function zoningUndecidedReason(z: ZoningReading): string {
  if (z.conflict) return "Zoning sources disagree; see Disagreements.";
  if (z.category === "other") {
    return "Zoning code not recognised by the keyword mapping; ask the city which category applies.";
  }
  return "No zoning reading for this parcel.";
}

export function makeTest(
  t: Omit<TestResult, "resolver" | "requirementStatus"> & {
    resolver?: Resolver | null;
    requirementStatus?: TestResult["requirementStatus"];
  },
): TestResult {
  return {
    ...t,
    resolver: t.resolver ?? null,
    requirementStatus: t.requirementStatus ?? "repo-sourced",
  };
}

/**
 * Hazard screen for laws whose site exclusions carry mitigation exceptions.
 * A mapped hazard is therefore "unknown, likely blocked", never a hard fail.
 */
export function conditionalHazardTest(opts: {
  id: string;
  facts: ParcelFacts;
  lawName: string;
  requirementSourceIds: string[];
}): TestResult {
  const fire = hazard(opts.facts, "veryHighFire");
  const flood = hazard(opts.facts, "floodSfha");
  const hits: string[] = [];
  if (fire.value === "yes") hits.push("very high fire hazard severity zone");
  if (flood.value === "yes") hits.push("special flood hazard area");
  const gaps: string[] = [];
  if (fire.value === "unknown") gaps.push(fire.conflict ? "fire (sources disagree)" : "fire");
  if (flood.value === "unknown") gaps.push(flood.conflict ? "flood (sources disagree)" : "flood");

  let verdict: Verdict;
  let reason: string;
  let resolver: Resolver;
  if (hits.length) {
    verdict = "unknown";
    reason = `Mapped in a ${hits.join(" and a ")}. As this tool understands it, ${opts.lawName} excludes such sites unless the statute's mitigation conditions are met (wording unverified; see the requirement). Confirm against the statute and the current zone map.`;
    resolver = "statute";
  } else if (gaps.length) {
    verdict = "unknown";
    reason =
      fire.conflict || flood.conflict
        ? `Hazard layers disagree (${gaps.join(", ")}); see Disagreements. Resolve which layer the city relies on before reading this test.`
        : `No ${gaps.join(" or ")} hazard data has been queried for this parcel.`;
    resolver = "data-layer";
  } else {
    verdict = "pass";
    reason =
      "Not mapped in a very high fire zone or special flood hazard area by the layers checked. Other exclusions in the statute (for example wetlands, farmland, hazardous-waste sites) are not encoded yet.";
    resolver = "data-layer";
  }

  return makeTest({
    id: opts.id,
    requirement: `Site is not in an excluded hazard area. ${opts.lawName} is understood to apply site exclusions like other streamlining laws, including very high fire hazard severity zones and special flood hazard areas, some with mitigation exceptions. This wording is not traced to a document in this repo: read the cited fact sheet and statute before relying on this row.`,
    requirementSourceIds: opts.requirementSourceIds,
    requirementStatus: "unverified",
    dataSourceIds: unique([...fire.sourceIds, ...flood.sourceIds]),
    valueFound: `${describeCombined(fire, HAZARD_LABELS.veryHighFire)} ${describeCombined(flood, HAZARD_LABELS.floodSfha)}`,
    verdict,
    reason,
    resolver,
  });
}

/** Places where two sources say different things about this parcel. Shown, never resolved silently. */
export function detectConflicts(facts: ParcelFacts): Conflict[] {
  const conflicts: Conflict[] = [];
  const zoning = readZoning(facts);
  if (zoning.conflict) {
    conflicts.push({
      topic: "Zoning category",
      observations: facts.zoning.map((z) => ({
        sourceId: z.sourceId,
        value: `${z.code ?? "no code"}: ${z.category}`,
      })),
      note: "Sources read this parcel's zoning differently. Tests that depend on zoning return unknown until the city confirms which applies.",
    });
  }
  const keys: HazardKey[] = [
    "veryHighFire",
    "floodSfha",
    "faultZone",
    "wetlands",
    "farmland",
    "liquefaction",
  ];
  for (const key of keys) {
    const c = hazard(facts, key);
    if (c.conflict) {
      conflicts.push({
        topic: HAZARD_LABELS[key],
        observations: (facts.hazards[key] ?? []).map((o) => ({
          sourceId: o.sourceId,
          value: o.value,
        })),
        note: "Hazard layers disagree. Check each layer's vintage and which one the city relies on.",
      });
    }
  }
  return conflicts;
}
