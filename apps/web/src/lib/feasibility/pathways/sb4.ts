import {
  describeCombined,
  HAZARD_LABELS,
  hazard,
  invertedTriVerdict,
  makeTest,
  single,
  sourceName,
} from "../helpers";
import type { HazardKey, ParcelFacts, PathwayResult, TestResult, Verdict } from "../types";

const REQ = ["hcd-sb4-factsheet", "hcd-law-factsheets"];

/** Effective window per the HCD fact sheet: July 2, 2024 through January 1, 2036. */
const WINDOW_START = new Date("2024-07-02T00:00:00-07:00");
const WINDOW_END = new Date("2036-01-01T00:00:00-08:00");

function exclusionTest(facts: ParcelFacts, id: string, key: HazardKey): TestResult {
  const c = hazard(facts, key);
  const label = HAZARD_LABELS[key];
  const src = c.sourceIds.map(sourceName).join("; ");
  const verdict: Verdict = c.conflict ? "unknown" : invertedTriVerdict(c.value);
  return makeTest({
    id,
    requirement: `Site is not in a ${label.toLowerCase()} (HCD summary of the SB 4 site exclusions).`,
    requirementSourceIds: [...REQ, "repo-background"],
    dataSourceIds: c.sourceIds,
    valueFound: describeCombined(c, label),
    verdict,
    reason: c.conflict
      ? "Hazard layers disagree; see Disagreements."
      : c.value === "yes"
        ? `Mapped in a ${label.toLowerCase()} per ${src}. The HCD summary lists this as an exclusion; read Gov Code 65913.16 for any exceptions.`
        : c.value === "no"
          ? `Not mapped in a ${label.toLowerCase()} by ${src}.`
          : `No ${label.toLowerCase()} layer has been queried for this parcel.`,
    resolver: "data-layer",
  });
}

/** SB 4: housing on faith and nonprofit-college land. Gov Code 65913.16. */
export function assessSb4(facts: ParcelFacts, now: Date): PathwayResult {
  const tests: TestResult[] = [];
  const owner = facts.owner;
  const ownerSrc = owner.sourceId ? sourceName(owner.sourceId) : "";
  const qualifies = owner.type === "religious" || owner.type === "college";

  let ownerVerdict: Verdict;
  let ownerReason: string;
  if (owner.basis === "confirmed" && qualifies) {
    ownerVerdict = "pass";
    ownerReason = `Ownership by a ${owner.type} institution is confirmed by ${ownerSrc || "the record given"}. Also confirm the land was owned on January 1, 2024.`;
  } else if (owner.basis === "confirmed") {
    ownerVerdict = "fail";
    ownerReason = `Confirmed owner type is ${owner.type}, which SB 4 does not cover.`;
  } else if (owner.basis === "proxy" && qualifies) {
    ownerVerdict = "unknown";
    ownerReason = `A proxy (${ownerSrc || "unnamed"}) suggests a ${owner.type} owner. A proxy is a lead, not a fact: confirm with the Assessor roll or the recorded deed, including ownership on January 1, 2024.`;
  } else if (owner.basis === "proxy") {
    ownerVerdict = "unknown";
    ownerReason = `A proxy (${ownerSrc || "unnamed"}) suggests a ${owner.type} owner, which SB 4 would not cover, but ownership is not confirmed.`;
  } else {
    ownerVerdict = "unknown";
    ownerReason =
      "Owner type is not in the free parcel data. Confirm with the Assessor roll or the recorded deed.";
  }

  tests.push(
    makeTest({
      id: "sb4-owner",
      requirement:
        "Land is owned by a religious institution or an independent institution of higher education, and was on January 1, 2024.",
      requirementSourceIds: REQ,
      dataSourceIds: owner.sourceId ? [owner.sourceId] : [],
      valueFound: `Owner type: ${owner.type} (${owner.basis})${owner.detail ? `, ${owner.detail}` : ""}${ownerSrc ? ` per ${ownerSrc}` : ""}.`,
      verdict: ownerVerdict,
      reason: ownerReason,
      resolver: "owner-or-title",
    }),
  );

  const inWindow = now >= WINDOW_START && now < WINDOW_END;
  tests.push(
    makeTest({
      id: "sb4-effective-window",
      requirement:
        "The law is in effect: July 2, 2024 through January 1, 2036 per the HCD fact sheet.",
      requirementSourceIds: [...REQ, "repo-background"],
      dataSourceIds: [],
      valueFound: `Today is ${now.toISOString().slice(0, 10)}.`,
      verdict: inWindow ? "pass" : "fail",
      reason: inWindow
        ? "Today falls inside the effective window."
        : "Today falls outside the effective window.",
      resolver: "statute",
    }),
  );

  tests.push(exclusionTest(facts, "sb4-fire", "veryHighFire"));
  tests.push(exclusionTest(facts, "sb4-fault", "faultZone"));
  tests.push(exclusionTest(facts, "sb4-flood", "floodSfha"));
  tests.push(exclusionTest(facts, "sb4-wetlands", "wetlands"));
  tests.push(exclusionTest(facts, "sb4-farmland", "farmland"));

  const industrial = single(facts.adjacentIndustrial);
  tests.push(
    makeTest({
      id: "sb4-industrial",
      requirement: "Site is not near certain industrial uses (HCD summary).",
      requirementSourceIds: [...REQ, "repo-background"],
      dataSourceIds: industrial.sourceIds,
      valueFound: describeCombined(industrial, "Adjacent industrial use"),
      verdict: invertedTriVerdict(industrial.value),
      reason:
        industrial.value === "unknown"
          ? "Neighbouring land use has not been checked for this parcel."
          : industrial.value === "yes"
            ? "An adjacent parcel reads as industrial use. Read the statute for the exact distance and use tests."
            : "No adjacent industrial use per the source checked.",
      resolver: "data-layer",
    }),
  );

  const pct = facts.perimeterUrbanPct;
  tests.push(
    makeTest({
      id: "sb4-perimeter",
      requirement: "At least 75% of the site's perimeter adjoins urban uses.",
      requirementSourceIds: [...REQ, "repo-background"],
      dataSourceIds: [],
      valueFound: pct === null ? "Perimeter share not computed." : `${pct}% of perimeter adjoins urban uses.`,
      verdict: pct === null ? "unknown" : pct >= 75 ? "pass" : "fail",
      reason:
        pct === null
          ? "Computable from parcel geometry and the existing land use layer; not wired yet."
          : pct >= 75
            ? "Meets the 75% test as computed."
            : "Below the 75% test as computed.",
      resolver: "data-layer",
    }),
  );

  const aff = facts.plan.affordability;
  tests.push(
    makeTest({
      id: "sb4-affordability",
      requirement:
        "Units are 100% lower income, with up to 20% moderate income and 5% for staff allowed (HCD summary).",
      requirementSourceIds: [...REQ, "repo-background"],
      dataSourceIds: [],
      valueFound: `Planned affordability: ${aff}.`,
      verdict: aff === "100-lower" ? "pass" : aff === "mixed" ? "fail" : "unknown",
      reason:
        aff === "100-lower"
          ? "The plan is 100% lower income."
          : aff === "mixed"
            ? "A mixed-income plan does not meet the SB 4 affordability requirement."
            : "The project plan has no affordability mix yet.",
      resolver: "project-design",
    }),
  );

  return {
    id: "SB4",
    name: "SB 4",
    whatItOpens: "Housing on faith and nonprofit-college land",
    statute: "Gov Code 65913.16",
    sourceIds: [...REQ, "leginfo-gov-65913-16", "calmatters-sb4"],
    tests,
    notes: [
      "There is no free public layer of religious- or college-owned parcels. Ownership proxies come from worship-site maps and the IRS exempt-organizations file (DATA-SOURCES.md). A proxy is a lead, not a fact.",
      "The HCD summary also excludes sites near certain industrial uses and lists other exclusions; read Gov Code 65913.16 for the full list and any exceptions.",
    ],
    status: tests.some((t) => t.verdict === "fail") ? "blocked" : "open",
  };
}
