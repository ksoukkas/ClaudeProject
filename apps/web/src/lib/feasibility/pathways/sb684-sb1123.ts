import {
  makeTest,
  readZoning,
  single,
  sourceName,
  zoningUndecided,
  zoningUndecidedReason,
} from "../helpers";
import type { ParcelFacts, PathwayResult, TestResult, Verdict } from "../types";

const REQ = ["hcd-law-factsheets", "calmatters-sb684", "calmatters-sb1123"];

/** SB 684 / SB 1123: small-lot subdivisions of up to 10 homes without a hearing. */
export function assessSb684Sb1123(facts: ParcelFacts): PathwayResult {
  const zoning = readZoning(facts);
  const vacant = single(facts.vacant);
  const tests: TestResult[] = [];

  let zoningVerdict: Verdict;
  let zoningReason: string;
  if (zoningUndecided(zoning)) {
    zoningVerdict = "unknown";
    zoningReason = zoningUndecidedReason(zoning);
  } else if (zoning.category === "multifamily") {
    zoningVerdict = "pass";
    zoningReason = "Zoning reads as multifamily residential (SB 684).";
  } else if (zoning.category === "single-family") {
    if (vacant.value === "yes") {
      zoningVerdict = "pass";
      zoningReason =
        "Single-family zoning and the lot reads as vacant, which SB 1123 is understood to have added to the law (wording unverified; confirm the bill text and effective date).";
    } else if (vacant.value === "no") {
      zoningVerdict = "fail";
      zoningReason =
        "Single-family zoning with an existing use. As this tool understands it, the SB 1123 extension covers only vacant single-family lots (wording unverified; confirm the bill text).";
    } else {
      zoningVerdict = "unknown";
      zoningReason =
        "Single-family zoning; whether the lot is vacant is unknown, and that decides the SB 1123 test.";
    }
  } else {
    zoningVerdict = "fail";
    zoningReason = `Zoning reads as ${zoning.category}, which is neither multifamily nor single-family.`;
  }

  tests.push(
    makeTest({
      id: "sb684-zoning",
      requirement:
        "Lot is zoned for multifamily residential (SB 684), or is a vacant lot zoned for single-family residential (added by SB 1123). Wording not traced to a repo document; confirm in the fact sheet and the bill text.",
      requirementSourceIds: REQ,
      requirementStatus: "unverified",
      dataSourceIds: [...zoning.sourceIds, ...vacant.sourceIds],
      valueFound: `${zoning.summary} Vacant: ${vacant.sourceIds.length ? `${vacant.value} per ${vacant.sourceIds.map(sourceName).join("; ")}` : "no data"}.`,
      verdict: zoningVerdict,
      reason: zoningReason,
      resolver: zoning.category === "single-family" && vacant.value === "unknown" ? "site-visit" : "city-planning",
    }),
  );

  const lotSource = facts.lotSqftSourceId ? [facts.lotSqftSourceId] : [];
  tests.push(
    makeTest({
      id: "sb684-lot-size",
      requirement: "Lot is within the statute's maximum lot size.",
      requirementSourceIds: ["repo-pathways-json", "leginfo-gov-66499-41"],
      dataSourceIds: lotSource,
      valueFound:
        facts.lotSqft !== null
          ? `${facts.lotSqft.toLocaleString("en-US")} sq ft${lotSource.length ? ` per ${sourceName(lotSource[0])}` : ""}.`
          : "Lot size unknown.",
      verdict: "unknown",
      reason:
        "Limit not encoded: lot-size limits differ by source and by bill (pathways.json note). Read Gov Code 66499.41 and record the limit with a source before relying on this test.",
      resolver: "statute",
    }),
  );

  const homes = facts.plan.homes;
  tests.push(
    makeTest({
      id: "sb684-unit-count",
      requirement:
        "The subdivision creates 10 or fewer parcels (docs/background.md says parcels; pathways.json says homes). Planned homes are used here as a proxy for parcels. ASSUMPTION.",
      requirementSourceIds: [...REQ, "repo-background", "repo-pathways-json"],
      dataSourceIds: [],
      valueFound:
        homes === null ? "Planned homes: not set." : `Planned homes: ${homes} (proxy for parcels).`,
      verdict: homes === null ? "unknown" : homes <= 10 ? "pass" : "fail",
      reason:
        homes === null
          ? "The project plan has no unit count yet."
          : homes <= 10
            ? "Within the limit of 10 given in both repo summaries, counting homes as a proxy for parcels."
            : "More than 10, counting homes as a proxy for parcels; this pathway is for small-lot subdivisions. Re-check if the plan has fewer parcels than homes.",
      resolver: "project-design",
    }),
  );

  return {
    id: "SB684_SB1123",
    name: "SB 684 / SB 1123",
    whatItOpens: "Small-lot subdivisions of up to 10 homes without a hearing",
    statute: "Gov Code 66499.41 and 65913.4.5",
    sourceIds: [...REQ, "leginfo-gov-66499-41", "repo-pathways-json"],
    tests,
    notes: [
      "The map rule is Gov Code 66499.41 and the companion building-permit rule is Gov Code 65913.4.5; SB 1123 amended these (docs/background.md).",
      "Other site tests in the statute are not encoded yet. Read it before relying on this pathway.",
    ],
    status: tests.some((t) => t.verdict === "fail") ? "blocked" : "open",
  };
}
