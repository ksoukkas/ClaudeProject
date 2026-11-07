import {
  conditionalHazardTest,
  describeCombined,
  invertedTriVerdict,
  makeTest,
  readZoning,
  single,
  zoningUndecided,
  zoningUndecidedReason,
} from "../helpers";
import type { ParcelFacts, PathwayResult, TestResult } from "../types";

const REQ = ["hcd-law-factsheets", "hcd-ab2011-draft-guidelines"];

/** AB 2011: housing on commercial corridors. Gov Code 65912.100 to 65912.140. */
export function assessAb2011(facts: ParcelFacts): PathwayResult {
  const zoning = readZoning(facts);
  const tests: TestResult[] = [];

  tests.push(
    makeTest({
      id: "ab2011-commercial-zone",
      requirement:
        "Site is in a zone where office, retail or parking are principally permitted uses. Wording not traced to a repo document; confirm in the fact sheet.",
      requirementSourceIds: REQ,
      requirementStatus: "unverified",
      dataSourceIds: zoning.sourceIds,
      valueFound: zoning.summary,
      verdict: zoningUndecided(zoning)
        ? "unknown"
        : zoning.category === "commercial"
          ? "pass"
          : zoning.category === "mixed-use"
            ? "unknown"
            : "fail",
      reason: zoningUndecided(zoning)
        ? zoningUndecidedReason(zoning)
        : zoning.category === "commercial"
          ? "Zoning reads as commercial."
          : zoning.category === "mixed-use"
            ? "Mixed-use zoning may or may not list office, retail or parking as principally permitted. Check the zone's permitted-use table."
            : `Zoning reads as ${zoning.category}, not a commercial zone.`,
      resolver: "city-planning",
    }),
  );

  const industrial = single(facts.adjacentIndustrial);
  tests.push(
    makeTest({
      id: "ab2011-industrial-adjacency",
      requirement:
        "Site is not adjacent to industrial use. The statute defines the adjacency test; read Gov Code 65912.100 to 65912.140. Wording not traced to a repo document.",
      requirementSourceIds: REQ,
      requirementStatus: "unverified",
      dataSourceIds: industrial.sourceIds,
      valueFound: describeCombined(industrial, "Adjacent industrial use"),
      verdict: invertedTriVerdict(industrial.value),
      reason:
        industrial.value === "unknown"
          ? "Neighbouring land use has not been checked for this parcel."
          : industrial.value === "yes"
            ? "An adjacent parcel reads as industrial use."
            : "No adjacent industrial use per the source checked.",
      resolver: "data-layer",
    }),
  );

  tests.push(
    makeTest({
      id: "ab2011-corridor",
      requirement:
        "For the mixed-income track, the site fronts a commercial corridor that meets the statute's street-width test. As this tool understands it the 100% affordable track does not carry the corridor test. Wording not traced to a repo document; confirm in the fact sheet and statute.",
      requirementSourceIds: REQ,
      requirementStatus: "unverified",
      dataSourceIds: [],
      valueFound: "Street width not checked.",
      verdict: "unknown",
      reason:
        "Street width is not encoded; it needs a street centerline layer with right-of-way widths. The width limits are in the statute and are not restated here.",
      resolver: "data-layer",
    }),
  );

  tests.push(
    conditionalHazardTest({
      id: "ab2011-hazards",
      facts,
      lawName: "AB 2011",
      requirementSourceIds: REQ,
    }),
  );

  return {
    id: "AB2011",
    name: "AB 2011",
    whatItOpens: "Housing on commercial corridors",
    statute: "Gov Code 65912.100 to 65912.140",
    sourceIds: [...REQ, "leginfo-gov-65912-101", "calmatters-ab2011"],
    tests,
    notes: [
      "AB 2011 has a 100% affordable track and a mixed-income track with different site and project tests (HCD summary). The site tests encoded here are the ones named in the summary; track-specific tests are not.",
      "Labor standards, affordability levels and density or height rules are project tests and are not encoded.",
      "HCD's guidelines were labelled Draft when checked (docs/background.md).",
    ],
    status: tests.some((t) => t.verdict === "fail") ? "blocked" : "open",
  };
}
