import { sourceName } from "./helpers";
import type { ParcelFacts, TitleCheck, TitleFlag } from "./types";

const DOCUMENTS_TO_REQUEST = [
  "Current vesting deed",
  "Declaration of CC&Rs and all amendments, if any",
  "Recorded easements (utility, access, drainage)",
  "Deed restrictions and recorded affordability or use covenants",
  "Recorded liens, judgments and notices, including code-enforcement notices",
  "Special tax and assessment districts shown on the tax roll",
  "Recorded tract or parcel map",
];

/**
 * Title and CC&R check as a workflow, not a verdict.
 *
 * No free public dataset lists covenants, easements or deed restrictions by
 * parcel, so this never returns pass. It raises flags from parcel signals,
 * states what is and is not known about state-law overrides, and drafts the
 * request a user would send to a title company. It never sends anything.
 */
export function buildTitleCheck(facts: ParcelFacts): TitleCheck {
  const flags: TitleFlag[] = [];

  const hoa = facts.hoaOrCcrs;
  if (hoa?.value === "yes") {
    flags.push({
      label: "CC&Rs or HOA indicated",
      reason: `Recorded covenants or an owners' association are indicated (${sourceName(hoa.sourceId)}). Covenants can restrict lot splits, unit counts and uses regardless of what state law allows.`,
      sourceIds: [hoa.sourceId],
      assumption: false,
    });
  } else if (hoa?.value === "no") {
    flags.push({
      label: "No CC&Rs per source",
      reason: `${sourceName(hoa.sourceId)} indicates no recorded covenants. A preliminary title report should still confirm this.`,
      sourceIds: [hoa.sourceId],
      assumption: false,
    });
  } else {
    flags.push({
      label: "CC&Rs unknown",
      reason:
        "No record says whether covenants exist. Treat this as unresolved until a preliminary title report has been read.",
      sourceIds: [],
      assumption: false,
    });
  }

  const plannedDevelopment = facts.zoning.some((z) =>
    /planned/i.test(`${z.code ?? ""} ${z.description ?? ""}`),
  );
  if (plannedDevelopment) {
    flags.push({
      label: "Planned-development zoning",
      reason:
        "Planned-development zoning is a rule-of-thumb signal that a development agreement or covenants may be recorded against the land. ASSUMPTION: a heuristic, not a sourced fact.",
      sourceIds: facts.zoning.map((z) => z.sourceId),
      assumption: true,
    });
  }

  if (facts.publicSurplusNotice?.value === "yes") {
    flags.push({
      label: "Surplus Land Act disposition",
      reason:
        "Land disposed of under the Surplus Land Act comes with affordable-housing requirements (HCD Surplus Land Act Guidelines). Read the guidelines for the exact terms and whether they are recorded against the land.",
      sourceIds: ["hcd-sla-guidelines-2024", facts.publicSurplusNotice.sourceId],
      assumption: false,
    });
  }

  if (facts.owner.type === "religious" || facts.owner.type === "college") {
    flags.push({
      label: "Institutional owner",
      reason:
        "Ask the institution about denominational or governing-body approvals and read the vesting deed for use restrictions or reversion clauses. A checklist item, not a finding.",
      sourceIds: facts.owner.sourceId ? [facts.owner.sourceId] : [],
      assumption: false,
    });
  }

  const notes = [
    "No free public dataset lists CC&Rs, easements or deed restrictions by parcel. A preliminary title report from a title company is the standard way to see them.",
    "Lead, not verified from any document in this repo: state ADU law is understood to limit covenants that ban accessory dwelling units (Civil Code 4751 via AB 670, 2019, marked UNVERIFIED in the sources list). No override of private covenants is known to this tool for SB 9 lot splits, SB 684 / SB 1123 subdivisions, AB 2011 or SB 4, so a recorded covenant can still block a site that passes every state-law test. Confirm with counsel.",
    "A parcel can pass every state test and still be dead on title. This section never returns pass.",
  ];

  const apnLine = facts.apn ? ` (APN ${facts.apn})` : " (APN to be provided)";
  const draftRequest = [
    `Subject: Preliminary title report request, ${facts.label}, ${facts.city}`,
    "",
    "Hello,",
    "",
    "We are evaluating this parcel for a possible affordable housing project and would like a preliminary title report.",
    "",
    `Parcel: ${facts.label}${apnLine}, ${facts.city}, Orange County.`,
    "",
    "Please include:",
    ...DOCUMENTS_TO_REQUEST.map((d) => `- ${d}`),
    "",
    "Thank you.",
    "",
    "[Your name and organization]",
    "",
    "-- Draft only. Cucumber does not send messages. Review before sending. --",
  ].join("\n");

  return {
    verdict: "unknown",
    flags,
    notes,
    documentsToRequest: DOCUMENTS_TO_REQUEST,
    draftRequest,
  };
}
