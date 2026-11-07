import { detectConflicts, readZoning, RESOLVER_LABELS, unique } from "./helpers";
import { assessAb2011 } from "./pathways/ab2011";
import { assessSb4 } from "./pathways/sb4";
import { assessSb684Sb1123 } from "./pathways/sb684-sb1123";
import { assessSb9 } from "./pathways/sb9";
import { getSource } from "./sources";
import { buildTitleCheck } from "./title-check";
import type {
  Conflict,
  Coverage,
  FeasibilityReport,
  LawDelta,
  NextStep,
  ParcelFacts,
  PathwayResult,
  Resolver,
  TestResult,
} from "./types";

/** Disagreements that exist in the sources themselves, independent of any parcel. */
function staticConflicts(): Conflict[] {
  return [
    {
      topic: "SB 684 / SB 1123 maximum lot size",
      observations: [
        {
          sourceId: "repo-pathways-json",
          value: "Lot-size limits differ by source and by bill",
        },
      ],
      note: "Not encoded. Read Gov Code 66499.41 and record the limit with a source before using it as a filter.",
    },
  ];
}

function computeCoverage(tests: TestResult[], conflicts: Conflict[]): Coverage {
  const passed = tests.filter((t) => t.verdict === "pass").length;
  const failed = tests.filter((t) => t.verdict === "fail").length;
  const unknown = tests.filter((t) => t.verdict === "unknown").length;
  const resolvedFromUnverifiedSources = tests.filter(
    (t) =>
      t.verdict !== "unknown" &&
      t.dataSourceIds.some((id) => getSource(id).status === "UNVERIFIED"),
  ).length;
  return {
    totalTests: tests.length,
    passed,
    failed,
    unknown,
    resolvedFromUnverifiedSources,
    conflicts: conflicts.length,
  };
}

/**
 * Group unknown tests by who can resolve them, most unknowns first.
 * ASSUMPTION: ranked by count of unknowns cleared, not by cost or time.
 */
function computeNextSteps(tests: TestResult[]): NextStep[] {
  const byResolver = new Map<Resolver, string[]>();
  for (const t of tests) {
    if (t.verdict !== "unknown" || !t.resolver) continue;
    const list = byResolver.get(t.resolver) ?? [];
    list.push(t.id);
    byResolver.set(t.resolver, list);
  }
  return Array.from(byResolver.entries())
    .map(([resolver, testIds]) => ({
      resolver,
      label: RESOLVER_LABELS[resolver],
      unknownsResolved: testIds.length,
      testIds,
    }))
    .sort((a, b) => b.unknownsResolved - a.unknownsResolved);
}

/** Run every pathway and assemble the report. Pure: same facts and date give the same report. */
export function assessParcel(facts: ParcelFacts, now: Date = new Date()): FeasibilityReport {
  const pathways: PathwayResult[] = [
    assessSb9(facts),
    assessSb684Sb1123(facts),
    assessAb2011(facts),
    assessSb4(facts, now),
  ];
  const allTests = pathways.flatMap((p) => p.tests);
  // Parcel-level disagreements count toward coverage; source-level ones are listed apart.
  const conflicts = detectConflicts(facts);
  const knownSourceDisagreements = staticConflicts();
  const coverage = computeCoverage(allTests, conflicts);
  const nextSteps = computeNextSteps(allTests);
  const title = buildTitleCheck(facts);
  const zoning = readZoning(facts);

  const delta: LawDelta = {
    zoningCategories: zoning.categories,
    baseZoningNote:
      "What local zoning alone allows (units, height, parking) is in the city's code and is not encoded here: unknown. The pathways are what state law may add on top of it. A pathway with no failing test is not a yes; its unknowns still have to be resolved.",
    open: pathways.filter((p) => p.status === "open").map((p) => p.id),
    blocked: pathways.filter((p) => p.status === "blocked").map((p) => p.id),
  };

  const sourceIds = unique([
    ...pathways.flatMap((p) => p.sourceIds),
    ...allTests.flatMap((t) => [...t.requirementSourceIds, ...t.dataSourceIds]),
    ...title.flags.flatMap((f) => f.sourceIds),
    ...facts.zoning.map((z) => z.sourceId),
    ...(facts.lotSqftSourceId ? [facts.lotSqftSourceId] : []),
    ...(facts.existingUse ? [facts.existingUse.sourceId] : []),
    ...(facts.inHqta ? [facts.inHqta.sourceId] : []),
    "repo-data-sources",
  ]);

  const assumptions: string[] = [
    "Next steps are ranked by how many unknowns they clear, not by cost or time. ASSUMPTION.",
    "Zoning categories are a keyword normalisation of each source's code; the source code is shown beside every reading. ASSUMPTION.",
    ...title.flags.filter((f) => f.assumption).map((f) => `${f.label}: ${f.reason}`),
  ];
  if (facts.synthetic) {
    assumptions.unshift(
      "This parcel is synthetic. Every value, including lot size, zoning, hazards and year built, is made up for testing. ASSUMPTION.",
    );
  }

  return {
    parcel: facts,
    generatedAt: now.toISOString(),
    pathways,
    delta,
    conflicts,
    knownSourceDisagreements,
    coverage,
    nextSteps,
    title,
    sourcesUsed: sourceIds.map(getSource),
    assumptions,
  };
}
