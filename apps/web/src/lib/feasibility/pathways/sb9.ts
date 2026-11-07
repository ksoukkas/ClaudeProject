import {
  conditionalHazardTest,
  describeCombined,
  invertedTriVerdict,
  makeTest,
  readZoning,
  single,
  triVerdict,
} from "../helpers";
import type { ParcelFacts, PathwayResult, TestResult } from "../types";

const REQ = ["hcd-sb9-factsheet", "hcd-sb9-implementation"];

/** SB 9: lot splits and duplexes on single-family lots. Gov Code 65852.21 and 66411.7. */
export function assessSb9(facts: ParcelFacts): PathwayResult {
  const zoning = readZoning(facts);
  const tests: TestResult[] = [];

  tests.push(
    makeTest({
      id: "sb9-single-family-zone",
      requirement: "Parcel is in a single-family residential zone.",
      requirementSourceIds: REQ,
      dataSourceIds: zoning.sourceIds,
      valueFound: zoning.summary,
      verdict:
        zoning.conflict || zoning.category === "unknown"
          ? "unknown"
          : zoning.category === "single-family"
            ? "pass"
            : "fail",
      reason: zoning.conflict
        ? "Zoning sources disagree; see Disagreements."
        : zoning.category === "unknown"
          ? "No zoning reading for this parcel."
          : zoning.category === "single-family"
            ? "Zoning reads as single-family residential."
            : `Zoning reads as ${zoning.category}, not single-family.`,
      resolver: "city-planning",
    }),
  );

  const urban = single(facts.inUrbanizedArea);
  tests.push(
    makeTest({
      id: "sb9-urbanized",
      requirement:
        "Parcel is in an urbanized area or urban cluster as designated by the Census Bureau.",
      requirementSourceIds: REQ,
      dataSourceIds: urban.sourceIds,
      valueFound: describeCombined(urban, "Urbanized area"),
      verdict: triVerdict(urban.value),
      reason:
        urban.value === "unknown"
          ? "No urban-area layer is wired yet."
          : urban.value === "yes"
            ? "Inside a designated urban area."
            : "Outside designated urban areas.",
      resolver: "data-layer",
    }),
  );

  const historic = single(facts.historicDistrict);
  tests.push(
    makeTest({
      id: "sb9-historic",
      requirement:
        "Parcel is not in a historic district and is not a designated historic property.",
      requirementSourceIds: REQ,
      dataSourceIds: historic.sourceIds,
      valueFound: describeCombined(historic, "Historic district or property"),
      verdict: invertedTriVerdict(historic.value),
      reason:
        historic.value === "unknown"
          ? "No historic-resources layer is wired; the city keeps this list."
          : historic.value === "yes"
            ? "Mapped as historic, which SB 9 excludes."
            : "Not mapped as historic by the source checked.",
      resolver: "city-planning",
    }),
  );

  const tenant = single(facts.tenantOccupiedLast3Years);
  tests.push(
    makeTest({
      id: "sb9-tenancy",
      requirement:
        "The project would not demolish or alter housing occupied by a tenant in the last three years (HCD summary: no tenant occupancy in the prior three years).",
      requirementSourceIds: [...REQ, "repo-background"],
      dataSourceIds: tenant.sourceIds,
      valueFound: describeCombined(tenant, "Tenant occupancy in the last three years"),
      verdict: invertedTriVerdict(tenant.value),
      reason:
        tenant.value === "unknown"
          ? "Occupancy history is not in public parcel data. The owner's records or a title report may show it."
          : tenant.value === "yes"
            ? "Tenant-occupied within the last three years, which SB 9 excludes."
            : "No tenant occupancy in the last three years per the source checked.",
      resolver: "owner-or-title",
    }),
  );

  tests.push(
    conditionalHazardTest({ id: "sb9-hazards", facts, lawName: "SB 9", requirementSourceIds: REQ }),
  );

  return {
    id: "SB9",
    name: "SB 9",
    whatItOpens: "Lot splits and duplexes on single-family lots",
    statute: "Gov Code 65852.21 and 66411.7",
    sourceIds: [...REQ, "leginfo-gov-65852-21", "leginfo-gov-66411-7", "calmatters-sb9"],
    tests,
    notes: [
      "Cities may apply objective standards such as parking (up to one space per unit) and setbacks (up to four feet) per the HCD fact sheet. The local code is not encoded here.",
      "HCD describes a 60-day decision clock and a 30-day completeness check (docs/background.md, from the HCD fact sheet).",
      "Other statutory tests, such as minimum resulting lot sizes and owner-occupancy requirements, are not encoded yet. Read the statute.",
    ],
    status: tests.some((t) => t.verdict === "fail") ? "blocked" : "open",
  };
}
