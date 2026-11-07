/**
 * Deterministic keyword parser. Used when no ANTHROPIC_API_KEY is set or the
 * Claude call fails. Pure and framework-free, so it is unit-tested.
 */
import type { LawId } from "../sample-data";
import { OC_CITIES, type OcCity } from "./cities";
import type { Criteria, IncomeLevel, OwnerHint } from "./types";

type Rule = { re: RegExp };

const UNIT_RE =
  /\b(?:at\s+least\s+|min(?:imum)?\s+(?:of\s+)?)?(\d{1,5})\s*(?:\+|or\s+more|plus)?\s*(?:affordable\s+|lower[-\s]income\s+|low[-\s]income\s+|moderate[-\s]income\s+|income[-\s]restricted\s+|new\s+)?(?:units?|homes?|apartments?|dwellings?|du)\b/i;
const PERCENT_RE = /\b(\d{1,3})\s*%/;

const AFFORDABLE_RE =
  /\b(affordable|income[-\s]restricted|below[-\s]market|bmr|low(?:er)?[-\s]income|very[-\s]low|moderate[-\s]income)\b/i;
const LOWER_RE = /\b(low(?:er)?[-\s]income|very[-\s]low(?:[-\s]income)?)\b/i;
const MODERATE_RE = /\bmoderate[-\s]income\b/i;

const NO_TRANSIT_RE = /\b(no|not|without)\s+(near\s+)?transit\b/i;
const TRANSIT_RE =
  /\b(transit|rail|metrolink|train|station|bus(?:es)?|brt|hqta|tod|transit[-\s]oriented)\b/i;

const PATHWAY_RULES: { law: LawId; re: RegExp }[] = [
  { law: "SB9", re: /\bsb\s*-?\s*9\b|\blot\s+splits?\b|\bduplex(?:es)?\b/i },
  {
    law: "SB684_SB1123",
    re: /\bsb\s*-?\s*(684|1123)\b|\bsmall[-\s]lot\b|\bsmall\s+(infill\s+)?sites?\b|\bsubdivisions?\b/i,
  },
  { law: "AB2011", re: /\bab\s*-?\s*2011\b|\bcommercial\s+corridors?\b/i },
  {
    law: "SB4",
    re: /\bsb\s*-?\s*4\b|\bfaith(?:[-\s]owned|[-\s]based)?\b|\bchurch(?:es)?\b|\bcongregations?\b|\breligious\b|\bcolleges?\b/i,
  },
];

const OWNER_RULES: { hint: OwnerHint; re: RegExp }[] = [
  {
    hint: "faith",
    re: /\bfaith\b|\bchurch(?:es)?\b|\bcongregations?\b|\breligious\b|\bmosques?\b|\bsynagogues?\b|\btemples?\b/i,
  },
  {
    hint: "public",
    re: /\bpublic(?:ly)?[-\s](?:owned|land)\b|\bsurplus\b|\b(?:city|county|state|district)[-\s]owned\b|\bschool\s+district\b/i,
  },
  { hint: "commercial", re: /\bcommercial\b|\bretail\b|\bstrip\s+malls?\b|\boffice\b/i },
];

const STOPWORDS = new Set(
  "a an and the in on of for to near with at least or more plus land lots lot sites site find me give ten some any i we want need looking our that this month call about should be is are by from parcels parcel homes units unit owned based ca california oc orange county".split(
    " ",
  ),
);

/** Longest city name first so "Laguna Niguel" wins over a bare "Laguna". */
const CITIES_LONGEST_FIRST = [...OC_CITIES].sort((a, b) => b.length - a.length);

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function findCity(q: string): { city: OcCity | null; matched: string | null } {
  for (const city of CITIES_LONGEST_FIRST) {
    // "Orange County" is the county, not the City of Orange.
    const tail = city === "Orange" ? "(?!\\s+county)" : "";
    const re = new RegExp(`\\b${escapeRe(city)}\\b${tail}`, "i");
    const m = q.match(re);
    if (m) return { city, matched: m[0] };
  }
  return { city: null, matched: null };
}

export function parseQueryFallback(raw: string): Criteria {
  const q = raw.trim();
  let rest = ` ${q} `;
  const strip = (s: string | null | undefined) => {
    if (s) rest = rest.replace(s, " ");
  };

  const { city, matched } = findCity(q);
  strip(matched);

  const unitMatch = q.match(UNIT_RE);
  const minUnits = unitMatch ? Number(unitMatch[1]) : null;
  strip(unitMatch?.[0]);

  const pct = q.match(PERCENT_RE);
  const sharePercent = pct && Number(pct[1]) <= 100 ? Number(pct[1]) : null;
  strip(pct?.[0]);

  const mentioned = AFFORDABLE_RE.test(q);
  let incomeLevel: IncomeLevel | null = null;
  if (LOWER_RE.test(q)) incomeLevel = "lower";
  else if (MODERATE_RE.test(q)) incomeLevel = "moderate";

  let nearTransit: boolean | null = null;
  if (NO_TRANSIT_RE.test(q)) nearTransit = false;
  else if (TRANSIT_RE.test(q)) nearTransit = true;

  const pathways = PATHWAY_RULES.filter((r) => r.re.test(q)).map((r) => r.law);
  const ownerHints = OWNER_RULES.filter((r) => r.re.test(q)).map((r) => r.hint);

  const consumed: Rule[] = [
    { re: AFFORDABLE_RE },
    { re: NO_TRANSIT_RE },
    { re: TRANSIT_RE },
    ...PATHWAY_RULES,
    ...OWNER_RULES,
  ];
  for (const { re } of consumed) {
    rest = rest.replace(new RegExp(re.source, "gi"), " ");
  }
  const leftover = rest
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter((w) => w && !STOPWORDS.has(w) && !/^\d+$/.test(w));

  return {
    city,
    minUnits,
    affordability: { mentioned, incomeLevel, sharePercent },
    nearTransit,
    pathways,
    ownerHints,
    unparsed: leftover.length ? [`Not understood: ${[...new Set(leftover)].join(", ")}`] : [],
  };
}
