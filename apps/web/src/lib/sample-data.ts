/**
 * Sample workspace data for the demo screens, copied from the Figma designs.
 *
 * EVERYTHING HERE IS FICTIONAL: addresses, owners, organizations, listings,
 * documents (D-01, E-01, ...), unit ranges and findings. Do not present any of
 * it as real. Replace with sourced data as the pipeline comes online.
 *
 * The one exception is `laws[].sources`: those are real official links, copied
 * from lanes/1-find-it/data/pathways.json (checked 2026-11-06).
 */

import type { LawId } from "./types";

export type Feasibility = "feasible" | "review" | "blocked";
export type { LawId };
export type OwnerType = "Faith-owned" | "Commercial" | "Private" | "Public";

export const SNAPSHOT_DATE = "07 Nov 2026";
export const SNAPSHOT_ISO = "2026-11-07";

export const workspace = {
  organization: "Harbor Housing Collaborative",
  initials: "ML",
  savedCount: 8,
} as const;

export const laws: Record<
  LawId,
  { name: string; summary: string; sources: string[] }
> = {
  SB9: {
    name: "SB 9",
    summary: "Lot splits & duplexes",
    sources: [
      "https://www.hcd.ca.gov/sites/default/files/docs/planning-and-community/lot-splits-and-duplexes-sb-9.pdf",
    ],
  },
  SB684_SB1123: {
    name: "SB 684 / 1123",
    summary: "Small subdivisions",
    sources: [
      "https://calmatters.digitaldemocracy.org/bills/ca_202320240sb684",
      "https://calmatters.digitaldemocracy.org/bills/ca_202320240sb1123",
    ],
  },
  AB2011: {
    name: "AB 2011",
    summary: "Commercial corridors",
    sources: [
      "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=GOV&sectionNum=65912.101",
    ],
  },
  SB4: {
    name: "SB 4",
    summary: "Faith-owned housing",
    sources: [
      "https://www.hcd.ca.gov/sites/default/files/docs/planning-and-community/aff-hsg-faith-higher-ed-sb-4.pdf",
    ],
  },
};

export type Parcel = {
  id: string;
  rank: number;
  address: string;
  city: string;
  acres: number;
  owner: OwnerType;
  law: LawId;
  feasibility: Feasibility;
  yieldLabel: string;
  belowGoal: boolean;
  onMarket: boolean;
  reasoning: string;
  evidence: string;
};

/** The five ranked sample sites on the Results screen. */
export const parcels: Parcel[] = [
  {
    id: "olive-commons",
    rank: 1,
    address: "1840 W Olive Commons",
    city: "Anaheim",
    acres: 1.24,
    owner: "Faith-owned",
    law: "SB4",
    feasibility: "review",
    yieldLabel: "44–60 potential homes",
    belowGoal: false,
    onMarket: true,
    reasoning:
      "Faith ownership supports an SB 4 pathway; a private covenant still needs counsel review.",
    evidence: "Sample deed + SB 4 screen",
  },
  {
    id: "civic-orchard",
    rank: 2,
    address: "720 E Civic Orchard",
    city: "Santa Ana",
    acres: 0.86,
    owner: "Commercial",
    law: "AB2011",
    feasibility: "review",
    yieldLabel: "36–48 potential homes",
    belowGoal: false,
    onMarket: true,
    reasoning:
      "Commercial zoning screen passes; corridor frontage, labor, affordability and site exclusions need confirmation.",
    evidence: "Sample zoning + AB 2011 screen",
  },
  {
    id: "laurel-court",
    rank: 3,
    address: "6100 Laurel Court",
    city: "Buena Park",
    acres: 0.32,
    owner: "Private",
    law: "SB9",
    feasibility: "review",
    yieldLabel: "2–4 potential homes",
    belowGoal: true,
    onMarket: false,
    reasoning:
      "Single-family zoning fits an SB 9 screen; owner occupancy and exclusions remain unverified.",
    evidence: "Sample parcel + SB 9 screen",
  },
  {
    id: "lantern-way",
    rank: 4,
    address: "11800 Lantern Way",
    city: "Garden Grove",
    acres: 0.74,
    owner: "Public",
    law: "SB684_SB1123",
    feasibility: "review",
    yieldLabel: "6–10 potential homes",
    belowGoal: true,
    onMarket: false,
    reasoning:
      "Small-site pathway may fit; public disposal process and subdivision conditions are unresolved.",
    evidence: "Sample parcel + subdivision screen",
  },
  {
    id: "juniper-mews",
    rank: 5,
    address: "320 N Juniper Mews",
    city: "Fullerton",
    acres: 0.41,
    owner: "Private",
    law: "SB9",
    feasibility: "blocked",
    yieldLabel: "2–4* potential homes",
    belowGoal: true,
    onMarket: false,
    reasoning:
      "Sample recorded access easement covers the buildable area. No usable envelope identified.",
    evidence: "Sample easement exhibit",
  },
];

export const sampleCities = [
  "Anaheim",
  "Santa Ana",
  "Buena Park",
  "Garden Grove",
  "Fullerton",
] as const;

export type Finding = {
  title: string;
  subtitle?: string;
  status: string;
  tone: Feasibility | "neutral";
  body: string;
  evidence: string;
  link?: { label: string; href: string };
};

/** Full parcel report. Only the Olive Commons sample has one so far. */
export const reports: Record<
  string,
  {
    ownerName: string;
    headline: string;
    summary: string;
    facts: { label: string; value: string }[];
    factsNote: string;
    caveat: { title: string; body: string; evidence: string };
    stateLaw: Finding[];
    zoning: Finding[];
    zoningSource: string;
    title: Finding[];
    nextStep: { title: string; body: string };
  }
> = {
  "olive-commons": {
    ownerName: "Olive Commons Fellowship",
    headline: "Explore SB 4. Resolve title before committing.",
    summary:
      "Religious ownership suggests a state-law pathway. A recorded use covenant and a utility easement leave buildability unresolved.",
    facts: [
      { label: "Land area", value: "1.24 acres" },
      { label: "Potential yield", value: "44–60 homes" },
      { label: "Transit walk", value: "0.3 mi · sample" },
      { label: "Sample zoning", value: "CF · Community" },
    ],
    factsNote:
      "Sample parcel P-01 + capacity study C-01. Yield is an early estimate, not an entitlement.",
    caveat: {
      title: "State-law fit ≠ title clearance.",
      body: "A parcel may be legal under state law but blocked on title. Here, a private covenant may be overridden by state law — verify with an attorney before relying on that pathway.",
      evidence:
        "Sample covenant D-02 + SB 4 title review checklist. No legal clearance has been given.",
    },
    stateLaw: [
      {
        title: "SB 9",
        subtitle: laws.SB9.summary,
        status: "Doesn’t qualify",
        tone: "blocked",
        body: "The sample site is zoned for community facilities, not single-family residential use.",
        evidence:
          "Sample zoning extract Z-01 + SB 9 screening criteria",
        link: { label: "View source ↗", href: laws.SB9.sources[0] },
      },
      {
        title: "SB 684 / 1123",
        subtitle: laws.SB684_SB1123.summary,
        status: "Unclear",
        tone: "review",
        body: "Acreage is within the small-site screen; qualifying residential designation and all subdivision conditions are not confirmed.",
        evidence: "Sample parcel P-01 + SB 684 / 1123 checklist",
        link: { label: "View source ↗", href: laws.SB684_SB1123.sources[0] },
      },
      {
        title: "AB 2011",
        subtitle: laws.AB2011.summary,
        status: "Doesn’t qualify",
        tone: "blocked",
        body: "The sample institutional use does not meet the qualifying commercial-zoning screen. Corridor frontage alone is not enough.",
        evidence:
          "Sample zoning extract Z-01 + AB 2011 checklist",
        link: { label: "View statute ↗", href: laws.AB2011.sources[0] },
      },
      {
        title: "SB 4",
        subtitle: laws.SB4.summary,
        status: "Possible fit",
        tone: "review",
        body: "Sample deed shows eligible nonprofit religious ownership before the statutory cutoff. Affordability, labor and exclusion tests still require verification.",
        evidence:
          "Sample deed D-01 (2020) + SB 4 eligibility checklist",
        link: { label: "View source ↗", href: laws.SB4.sources[0] },
      },
    ],
    zoning: [
      {
        title: "CF · Community facilities (fictional code)",
        status: "Needs review",
        tone: "review",
        body: "This sample designation is intended for civic or religious uses, not ordinary apartments. An eligible SB 4 project may use a state-law pathway; confirm which local objective standards still apply.",
        evidence:
          "Sample Anaheim code extract Z-01 + SB 4 standards checklist",
      },
      {
        title: "Height, setbacks & access",
        status: "Unclear",
        tone: "review",
        body: "The 44–60 home range is a test fit, not a code envelope. Fire access, setbacks, utility capacity and applicable height standards have not been verified.",
        evidence:
          "Sample capacity study C-01; city planning confirmation outstanding",
      },
    ],
    zoningSource:
      "Sample zoning extract Z-01 is fictional. No real city code was used.",
    title: [
      {
        title: "Deed / religious-use covenant",
        status: "Restriction found",
        tone: "review",
        body: "Restriction found — may be overridden by state law, verify with attorney. The sample 1988 deed limits use to religious purposes; enforceability and any statutory override remain unresolved.",
        evidence:
          "Sample recorded covenant D-02, clause 4 + SB 4 review checklist",
      },
      {
        title: "Utility easement",
        status: "Restriction found",
        tone: "review",
        body: "A sample 12-foot utility strip crosses the east edge. It may reduce the buildable area; obtain a survey and utility consent before using the yield estimate.",
        evidence:
          "Sample easement E-01, exhibit B",
      },
      {
        title: "HOA covenants",
        status: "Unknown",
        tone: "neutral",
        body: "No HOA covenant appears in the sample document set. That does not prove there is none: order a current preliminary title report to confirm.",
        evidence: `Sample title index T-01, reviewed ${SNAPSHOT_DATE}`,
      },
    ],
    nextStep: {
      title: "Next: a short title review, not a purchase decision.",
      body: "Ask housing counsel to review D-02, then request a preliminary title report and a city pre-application meeting.",
    },
  },
};

export type PipelineCard = {
  address: string;
  city: string;
  details: string;
  feasibility: Feasibility;
  pathway: string;
  reasoning: string;
  evidence: string;
  task: string;
  date: string;
  parcelId?: string;
};

export const pipeline: {
  stage: string;
  hint: string;
  marker: "accent" | "warm";
  cards: PipelineCard[];
}[] = [
  {
    stage: "Watching",
    hint: "Keep an eye on the opportunity",
    marker: "accent",
    cards: [
      {
        address: "6100 Laurel Court",
        city: "Buena Park",
        details: "0.32 ac · Private · 2–4 homes",
        feasibility: "review",
        pathway: "SB 9",
        reasoning:
          "Single-family zoning fits an SB 9 screen; owner occupancy and exclusions remain unverified.",
        evidence: "Sample parcel + SB 9 screen",
        task: "Check occupancy and site exclusions",
        date: "Review Nov 12",
        parcelId: "laurel-court",
      },
      {
        address: "11800 Lantern Way",
        city: "Garden Grove",
        details: "0.74 ac · Public · 6–10 homes",
        feasibility: "review",
        pathway: "SB 684 / 1123",
        reasoning:
          "Small-site pathway may fit; public disposal process and subdivision conditions are unresolved.",
        evidence: "Sample parcel + subdivision screen",
        task: "Confirm public disposal process",
        date: "Review Nov 14",
        parcelId: "lantern-way",
      },
    ],
  },
  {
    stage: "Researching",
    hint: "Resolve the important unknowns",
    marker: "warm",
    cards: [
      {
        address: "1840 W Olive Commons",
        city: "Anaheim",
        details: "1.24 ac · Faith-owned · 44–60 homes",
        feasibility: "review",
        pathway: "SB 4",
        reasoning:
          "Faith ownership supports an SB 4 pathway; a private covenant still needs counsel review.",
        evidence: "Sample deed + SB 4 screen",
        task: "Ask counsel to review use covenant",
        date: "Due Nov 10",
        parcelId: "olive-commons",
      },
      {
        address: "320 N Juniper Mews",
        city: "Fullerton",
        details: "0.41 ac · Private · 2–4 homes*",
        feasibility: "blocked",
        pathway: "SB 9",
        reasoning:
          "Sample recorded access easement covers the buildable area. No usable envelope identified.",
        evidence: "Sample easement exhibit",
        task: "Verify easement; consider archiving",
        date: "Due Nov 11",
        parcelId: "juniper-mews",
      },
    ],
  },
  {
    stage: "Contacted",
    hint: "Build a shared understanding",
    marker: "accent",
    cards: [
      {
        address: "720 E Civic Orchard",
        city: "Santa Ana",
        details: "0.86 ac · Commercial · 36–48 homes",
        feasibility: "review",
        pathway: "AB 2011",
        reasoning:
          "Commercial zoning screen passes; corridor frontage, labor, affordability and site exclusions need confirmation.",
        evidence: "Sample zoning + AB 2011 screen",
        task: "Follow up with Civic Orchard Partners",
        date: "Sent Nov 05",
        parcelId: "civic-orchard",
      },
      {
        address: "905 S Mercy Court",
        city: "Santa Ana",
        details: "1.10 ac · Faith-owned · Yield pending",
        feasibility: "review",
        pathway: "SB 4 screen pending",
        reasoning:
          "Eligibility, zoning and title have not been screened. Due diligence is outstanding.",
        evidence: "Sample owner profile only",
        task: "Meet Mesa Lantern Congregation",
        date: "Meeting Nov 16",
      },
    ],
  },
  {
    stage: "Under option",
    hint: "Sample agreements in diligence",
    marker: "accent",
    cards: [
      {
        address: "450 N Meadow Passage",
        city: "Fullerton",
        details: "0.92 ac · Faith-owned · Yield pending",
        feasibility: "review",
        pathway: "SB 4 screen pending",
        reasoning:
          "Eligibility, zoning and title have not been screened. Due diligence is outstanding.",
        evidence: "Sample owner profile only",
        task: "Commission survey and test fit",
        date: "Option ends Jan 15",
      },
      {
        address: "210 S Alder Commons",
        city: "Anaheim",
        details: "0.68 ac · Commercial · Yield pending",
        feasibility: "review",
        pathway: "AB 2011 screen pending",
        reasoning:
          "Eligibility, zoning and title have not been screened. Due diligence is outstanding.",
        evidence: "Sample owner profile only",
        task: "Verify corridor and labor requirements",
        date: "Option ends Feb 01",
      },
    ],
  },
];

export const alertRules = [
  {
    id: "faith-santa-ana",
    rule: "Notify me when a faith-owned parcel over 0.5 acres in Santa Ana is listed.",
    meta: "Listing changes · Checked daily · Last checked today, 8:00 AM · No new sample matches",
    delivery: "Email + in-app",
    enabled: true,
  },
  {
    id: "olive-title",
    rule: "Notify me when title findings change for 1840 W Olive Commons.",
    meta: "Saved site changes · Weekly summary on Mondays · Paused by Maya Lee",
    delivery: "Weekly email",
    enabled: false,
  },
];

export type Profile = {
  name: string;
  kind: string;
  icon: "church" | "store" | "house" | "building2" | "blocks";
  location: string;
  tag: string;
  goal: string;
  fit: string;
};

export const landowners: Profile[] = [
  {
    name: "Olive Commons Fellowship",
    kind: "Congregation",
    icon: "church",
    location: "Anaheim · 1.24 acres",
    tag: "Open to a ground lease",
    goal: "Retain a worship space and create 40+ affordable homes through a long-term ground lease.",
    fit: "Potential fit: a nonprofit comfortable with SB 4 diligence and shared-campus design.",
  },
  {
    name: "Mesa Lantern Congregation",
    kind: "Congregation",
    icon: "church",
    location: "Santa Ana · 1.10 acres",
    tag: "Early conversation",
    goal: "Explore family housing on underused parking while preserving community meal services.",
    fit: "Potential fit: an experienced family-housing developer with predevelopment capacity.",
  },
  {
    name: "Civic Orchard Partners",
    kind: "Commercial owner",
    icon: "store",
    location: "Santa Ana · 0.86 acres",
    tag: "On the market · sample",
    goal: "Sell a commercial site to a mission-aligned buyer. Open to a conditional diligence period.",
    fit: "Potential fit: a buyer exploring AB 2011; labor and site exclusions still need review.",
  },
];

export const developers: Profile[] = [
  {
    name: "Harbor Housing Collaborative",
    kind: "Nonprofit developer",
    icon: "house",
    location: "North & central OC · Seeking 0.75–3 acres",
    tag: "Seeking sites now",
    goal: "Build 40–80 affordable family homes near transit. Purchase or a long-term ground lease.",
    fit: "Looking for: faith-owned or commercial sites in Anaheim, Santa Ana and Garden Grove.",
  },
  {
    name: "Orange Grove Community Homes",
    kind: "Nonprofit developer",
    icon: "building2",
    location: "Santa Ana & Garden Grove · Seeking 0.5–2 acres",
    tag: "Ground-lease ready",
    goal: "Create 25–60 homes for low-income families, with space for neighborhood services.",
    fit: "Looking for: a landowner willing to co-plan and allow a 12-month diligence window.",
  },
  {
    name: "Common Ground Housing Studio",
    kind: "Nonprofit developer",
    icon: "blocks",
    location: "Fullerton & Buena Park · Seeking 0.2–1 acre",
    tag: "Small-site specialist",
    goal: "Deliver small ownership communities with 4–10 homes and long-term affordability.",
    fit: "Looking for: infill sites with subdivision potential and a clear access envelope.",
  },
];
