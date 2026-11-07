/**
 * Results filters: URL parsing, filtering, sorting, counts and a small
 * keyword reader for the Scout query. Pure TypeScript, no React or Next.js,
 * so it runs in the browser, on the server and under `npm test`.
 *
 * Precedence for every filter: explicit URL param > parsed from `q` > default.
 */
import type {
  Confidence,
  Feasibility,
  LawId,
  OwnerType,
  Parcel,
} from "./sample-data";

export type SortKey = "fit" | "units" | "acres" | "confidence";

export type FilterState = {
  q: string;
  cities: string[];
  law: LawId | null;
  owner: OwnerType | null;
  minAcres: number | null;
  maxAcres: number | null;
  unitGoal: number;
  onMarketOnly: boolean;
  status: Feasibility | null;
  sort: SortKey;
};

/** The example search shown on Scout and used by "View preliminary results". */
export const EXAMPLE_QUERY = "Anaheim, 40+ affordable units, near transit";

export const DEFAULT_FILTERS: FilterState = {
  q: "",
  cities: [],
  law: null,
  owner: null,
  minAcres: null,
  maxAcres: null,
  // ASSUMPTION: default from the Scout example query ("40+ affordable units").
  // It labels sites as below / may meet / meets; it never hides them.
  unitGoal: 40,
  onMarketOnly: false,
  status: null,
  sort: "fit",
};

/**
 * ASSUMPTION: "small" or "infill" in a query means a lot of 0.5 acres or less.
 * Not from any statute; a round number for the demo.
 */
export const SMALL_SITE_MAX_ACRES = 0.5;

export const LAW_IDS = ["SB9", "SB684_SB1123", "AB2011", "SB4"] as const satisfies readonly LawId[];
export const OWNER_TYPES = [
  "Faith-owned",
  "Commercial",
  "Private",
  "Public",
] as const satisfies readonly OwnerType[];
export const FEASIBILITIES = ["feasible", "review", "blocked"] as const satisfies readonly Feasibility[];
export const SORT_KEYS = ["fit", "units", "acres", "confidence"] as const satisfies readonly SortKey[];

export const sortLabel: Record<SortKey, string> = {
  fit: "Best fit",
  units: "Most homes (low estimate)",
  acres: "Largest lot",
  confidence: "Highest confidence",
};

// Compile-time check that the lists above cover every member of each union.
type Covers<All, Listed> = [Exclude<All, Listed>] extends [never] ? true : never;
const _covers: [
  Covers<LawId, (typeof LAW_IDS)[number]>,
  Covers<OwnerType, (typeof OWNER_TYPES)[number]>,
  Covers<Feasibility, (typeof FEASIBILITIES)[number]>,
  Covers<SortKey, (typeof SORT_KEYS)[number]>,
] = [true, true, true, true];
void _covers;

/* ------------------------------------------------------------------------ */
/* URL params                                                                */
/* ------------------------------------------------------------------------ */

export type ParamSource =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

function getAll(source: ParamSource, key: string): string[] {
  if (source instanceof URLSearchParams) return source.getAll(key);
  const value = source[key];
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function getFirst(source: ParamSource, key: string): string | undefined {
  return getAll(source, key)[0];
}

function pickCaseless<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): T | undefined {
  if (value === undefined) return undefined;
  const v = value.trim().toLowerCase();
  return allowed.find((a) => a.toLowerCase() === v);
}

function parseAcres(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 10_000 ? n : undefined;
}

function parseGoal(value: string | undefined): number | undefined {
  if (value === undefined || !/^\d{1,5}$/.test(value.trim())) return undefined;
  const n = Number(value);
  return n >= 1 && n <= 10_000 ? n : undefined;
}

const MAX_QUERY_LENGTH = 200;

/**
 * The filters that are explicitly set in the URL. Missing or bad values are
 * left out, so the caller can fall back to the query or the default.
 * `cities` limits city values to a known list (case-insensitive).
 */
export function readFilterParams(
  source: ParamSource,
  cities?: readonly string[],
): Partial<FilterState> {
  const out: Partial<FilterState> = {};

  const q = getFirst(source, "q")?.trim();
  if (q) out.q = q.slice(0, MAX_QUERY_LENGTH);

  const cityValues = getAll(source, "city")
    .map((c) => (cities ? pickCaseless(c, cities) : c.trim() || undefined))
    .filter((c): c is string => Boolean(c));
  if (cityValues.length > 0) out.cities = [...new Set(cityValues)];

  const law = pickCaseless(getFirst(source, "law"), LAW_IDS);
  if (law) out.law = law;

  const owner = pickCaseless(getFirst(source, "owner"), OWNER_TYPES);
  if (owner) out.owner = owner;

  const minAcres = parseAcres(getFirst(source, "minAcres"));
  const maxAcres = parseAcres(getFirst(source, "maxAcres"));
  // An impossible range (min above max) is a bad value: drop both.
  if (!(minAcres !== undefined && maxAcres !== undefined && minAcres > maxAcres)) {
    if (minAcres !== undefined) out.minAcres = minAcres;
    if (maxAcres !== undefined) out.maxAcres = maxAcres;
  }

  const goal = parseGoal(getFirst(source, "goal"));
  if (goal !== undefined) out.unitGoal = goal;

  if (getFirst(source, "market")?.trim().toLowerCase() === "on") out.onMarketOnly = true;

  const status = pickCaseless(getFirst(source, "status"), FEASIBILITIES);
  if (status) out.status = status;

  const sort = pickCaseless(getFirst(source, "sort"), SORT_KEYS);
  if (sort) out.sort = sort;

  return out;
}

/** URL params only, with defaults for anything missing or bad. */
export function parseFilterParams(
  source: ParamSource,
  cities?: readonly string[],
): FilterState {
  return { ...DEFAULT_FILTERS, ...readFilterParams(source, cities) };
}

/** Full state for a URL: explicit param > parsed from q > default. */
export function resolveFilters(
  source: ParamSource,
  cities: readonly string[],
): FilterState {
  const explicit = readFilterParams(source, cities);
  const parsed = parseQuery(explicit.q ?? "", cities);
  return { ...DEFAULT_FILTERS, ...parsed.patch, ...explicit };
}

/** Serialize to URL params, leaving out anything equal to its default. */
export function toSearchParams(state: FilterState): URLSearchParams {
  const p = new URLSearchParams();
  const d = DEFAULT_FILTERS;
  if (state.q.trim()) p.set("q", state.q.trim());
  for (const city of state.cities) p.append("city", city);
  if (state.law !== d.law && state.law) p.set("law", state.law);
  if (state.owner !== d.owner && state.owner) p.set("owner", state.owner);
  if (state.minAcres !== null) p.set("minAcres", String(state.minAcres));
  if (state.maxAcres !== null) p.set("maxAcres", String(state.maxAcres));
  if (state.unitGoal !== d.unitGoal) p.set("goal", String(state.unitGoal));
  if (state.onMarketOnly) p.set("market", "on");
  if (state.status) p.set("status", state.status);
  if (state.sort !== d.sort) p.set("sort", state.sort);
  return p;
}

/* ------------------------------------------------------------------------ */
/* Filtering, sorting, counts                                                */
/* ------------------------------------------------------------------------ */

type Criterion = "cities" | "law" | "owner" | "acres" | "onMarketOnly" | "status";

function matches(p: Parcel, s: FilterState, skip?: Criterion): boolean {
  if (skip !== "cities" && s.cities.length > 0 && !s.cities.includes(p.city)) return false;
  if (skip !== "law" && s.law && p.law !== s.law) return false;
  if (skip !== "owner" && s.owner && p.owner !== s.owner) return false;
  if (skip !== "acres") {
    if (s.minAcres !== null && !(p.acres >= s.minAcres)) return false;
    if (s.maxAcres !== null && !(p.acres <= s.maxAcres)) return false;
  }
  if (skip !== "onMarketOnly" && s.onMarketOnly && !p.onMarket) return false;
  if (skip !== "status" && s.status && p.feasibility !== s.status) return false;
  return true;
}

/** Parcels that pass every filter, in their original order. q and unitGoal never hide a site. */
export function applyFilters(parcels: readonly Parcel[], state: FilterState): Parcel[] {
  return parcels.filter((p) => matches(p, state));
}

const confidenceRank: Record<Confidence, number> = { High: 3, Medium: 2, Low: 1 };

/** Descending by a numeric value; unknown (null) always sorts after known. */
function byKnownDesc(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b - a;
}

/**
 * Stable sort. "fit" is the sample ranking; the others sort high to low and
 * break ties by rank. "units" uses the low end of the yield range, so a wide
 * range does not jump ahead on its optimistic end.
 */
export function sortParcels(parcels: readonly Parcel[], sort: SortKey): Parcel[] {
  const key: (p: Parcel) => number | null = {
    fit: () => 0,
    units: (p: Parcel) => p.yieldMin,
    acres: (p: Parcel) => p.acres,
    confidence: (p: Parcel) => confidenceRank[p.confidence] ?? null,
  }[sort];
  return parcels
    .map((p, i) => ({ p, i }))
    .sort((a, b) => byKnownDesc(key(a.p), key(b.p)) || a.p.rank - b.p.rank || a.i - b.i)
    .map(({ p }) => p);
}

export type CountKey = "cities" | "law" | "owner" | "status" | "onMarketOnly";

/**
 * How many parcels each option of one filter would show, given every other
 * filter. `all` is the count with this filter cleared. For onMarketOnly the
 * keys are `off` (= all) and `on`.
 */
export function countByOption(
  parcels: readonly Parcel[],
  state: FilterState,
  key: CountKey,
): Record<string, number> {
  const pool = parcels.filter((p) => matches(p, state, key));
  const counts: Record<string, number> = { all: pool.length };
  if (key === "onMarketOnly") {
    counts.off = pool.length;
    counts.on = pool.filter((p) => p.onMarket).length;
    return counts;
  }
  const valueOf = {
    cities: (p: Parcel) => p.city,
    law: (p: Parcel) => p.law,
    owner: (p: Parcel) => p.owner,
    status: (p: Parcel) => p.feasibility,
  }[key];
  for (const p of pool) counts[valueOf(p)] = (counts[valueOf(p)] ?? 0) + 1;
  return counts;
}

export type GoalFit = "meets" | "may-meet" | "below" | "unknown";

/**
 * Compare a site's estimated yield range to the unit goal. "meets" means even
 * the low estimate reaches the goal; "may-meet" means only the high end does.
 */
export function goalFit(
  parcel: Pick<Parcel, "yieldMin" | "yieldMax">,
  goal: number,
): GoalFit {
  const { yieldMin: lo, yieldMax: hi } = parcel;
  if (lo === null && hi === null) return "unknown";
  if (lo !== null && lo >= goal) return "meets";
  if (hi !== null && hi >= goal) return "may-meet";
  if (hi === null) return "unknown"; // low end is short, high end unknown
  return "below";
}

/* ------------------------------------------------------------------------ */
/* Query reader                                                              */
/* ------------------------------------------------------------------------ */

export type QueryKey = "cities" | "law" | "owner" | "maxAcres" | "unitGoal";

export type UnderstoodItem = {
  key: QueryKey;
  label: string;
  value: string | number;
  /** The exact substrings of q this came from, so it can be removed again. */
  matched: string[];
};

export type ParsedQuery = {
  patch: Partial<FilterState>;
  understood: UnderstoodItem[];
  /** Words or phrases that did not map to a filter. Always shown to the user. */
  ignored: string[];
};

// Grammar and generic nouns that carry no filter by themselves.
const FILLER = new Set([
  "a", "an", "the", "in", "on", "at", "for", "of", "and", "or", "with", "to",
  "find", "show", "me", "lots", "lot", "land", "sites", "site", "parcels",
  "parcel", "units", "unit", "homes", "home", "housing", "owned", "based",
]);

const OWNER_PATTERNS: { re: RegExp; owner: OwnerType }[] = [
  { re: /\b(?:faith(?:[-\s]?(?:owned|based))?|churche?s?|congregations?)\b/gi, owner: "Faith-owned" },
  { re: /\b(?:commercial|corridors?)\b/gi, owner: "Commercial" },
];
const SMALL_RE = /\b(?:small|infill)\b/gi;
// Bill numbers, e.g. "SB 9", "AB 2011", "SB 684 / 1123". Read as the law
// filter so their digits are never mistaken for a unit goal.
const LAW_RE = /\b(SB|AB)\s*(\d{1,4})(?:\s*\/\s*(?:SB\s*)?(\d{1,4}))?\b/gi;
const LAW_BY_BILL: Record<string, LawId> = {
  "SB 9": "SB9",
  "SB 684": "SB684_SB1123",
  "SB 1123": "SB684_SB1123",
  "AB 2011": "AB2011",
  "SB 4": "SB4",
};
const LAW_LABEL: Record<LawId, string> = {
  SB9: "SB 9",
  SB684_SB1123: "SB 684 / 1123",
  AB2011: "AB 2011",
  SB4: "SB 4",
};
// A bare four-digit year (e.g. "2025") is not a unit goal unless it says units/homes.
const YEAR_MIN = 1900;
const YEAR_MAX = 2100;
// A number not part of a decimal and not followed by acres or %, e.g. "40+",
// "40 units", "25 homes".
const GOAL_RE = /(?<![\d.])(\d{1,5})(?:\s*\+)?(?:\s*(?:units?|homes?)\b)?(?![\d.]|\s*(?:acres?\b|ac\b|%))/gi;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type Span = { start: number; end: number };

/**
 * Read cities, owner type, "small/infill" and a unit goal out of free text.
 * Anything else is returned in `ignored` (grouped by comma) so the UI can say
 * it was not used.
 */
export function parseQuery(q: string, cities: readonly string[]): ParsedQuery {
  const text = q.slice(0, MAX_QUERY_LENGTH);
  const used: Span[] = [];
  const understood: UnderstoodItem[] = [];
  const patch: Partial<FilterState> = {};
  const overlaps = (s: number, e: number) => used.some((u) => s < u.end && e > u.start);

  // Cities, in the order they appear.
  const cityHits: { city: string; at: number; text: string }[] = [];
  for (const city of cities) {
    const re = new RegExp(`\\b${escapeRegExp(city).replace(/\s+/g, "\\s+")}\\b`, "gi");
    for (const m of text.matchAll(re)) {
      if (overlaps(m.index, m.index + m[0].length)) continue;
      used.push({ start: m.index, end: m.index + m[0].length });
      cityHits.push({ city, at: m.index, text: m[0] });
    }
  }
  cityHits.sort((a, b) => a.at - b.at);
  for (const hit of cityHits) {
    const existing = understood.find((u) => u.key === "cities" && u.value === hit.city);
    if (existing) existing.matched.push(hit.text);
    else understood.push({ key: "cities", label: hit.city, value: hit.city, matched: [hit.text] });
  }
  if (cityHits.length > 0) patch.cities = [...new Set(cityHits.map((h) => h.city))];

  // Owner type: the first match wins; a conflicting one is left unused.
  const ownerHits = OWNER_PATTERNS.flatMap(({ re, owner }) =>
    [...text.matchAll(re)].map((m) => ({ owner, at: m.index, text: m[0] })),
  )
    .filter((h) => !overlaps(h.at, h.at + h.text.length))
    .sort((a, b) => a.at - b.at);
  if (ownerHits.length > 0) {
    const owner = ownerHits[0].owner;
    const same = ownerHits.filter((h) => h.owner === owner);
    for (const h of same) used.push({ start: h.at, end: h.at + h.text.length });
    patch.owner = owner;
    understood.push({ key: "owner", label: owner, value: owner, matched: same.map((h) => h.text) });
  }

  // Law: the first bill we know wins. Unknown bills stay in `ignored`, but
  // their digits are still kept away from the unit goal below.
  const billSpans: Span[] = [];
  let lawHit: { law: LawId; text: string; at: number } | null = null;
  for (const m of text.matchAll(LAW_RE)) {
    if (overlaps(m.index, m.index + m[0].length)) continue;
    billSpans.push({ start: m.index, end: m.index + m[0].length });
    const prefix = m[1].toUpperCase();
    const law = LAW_BY_BILL[`${prefix} ${Number(m[2])}`] ??
      (m[3] ? LAW_BY_BILL[`${prefix} ${Number(m[3])}`] : undefined);
    if (law && !lawHit) lawHit = { law, text: m[0], at: m.index };
  }
  if (lawHit) {
    used.push({ start: lawHit.at, end: lawHit.at + lawHit.text.length });
    patch.law = lawHit.law;
    understood.push({ key: "law", label: LAW_LABEL[lawHit.law], value: lawHit.law, matched: [lawHit.text] });
  }
  const inBill = (s: number, e: number) => billSpans.some((b) => s < b.end && e > b.start);

  // "small" / "infill" -> lot size cap (ASSUMPTION, see SMALL_SITE_MAX_ACRES).
  const smallHits = [...text.matchAll(SMALL_RE)].filter(
    (m) => !overlaps(m.index, m.index + m[0].length),
  );
  if (smallHits.length > 0) {
    for (const m of smallHits) used.push({ start: m.index, end: m.index + m[0].length });
    patch.maxAcres = SMALL_SITE_MAX_ACRES;
    understood.push({
      key: "maxAcres",
      label: `Up to ${SMALL_SITE_MAX_ACRES} acres (ASSUMPTION for “small”)`,
      value: SMALL_SITE_MAX_ACRES,
      matched: smallHits.map((m) => m[0]),
    });
  }

  // Unit goal: the first usable number.
  for (const m of text.matchAll(GOAL_RE)) {
    if (overlaps(m.index, m.index + m[0].length) || inBill(m.index, m.index + m[0].length)) continue;
    const n = Number(m[1]);
    if (n < 1 || n > 10_000) continue;
    const saysUnits = /\+|units?|homes?/i.test(m[0]);
    if (!saysUnits && m[1].length === 4 && n >= YEAR_MIN && n <= YEAR_MAX) continue;
    used.push({ start: m.index, end: m.index + m[0].length });
    patch.unitGoal = n;
    understood.push({ key: "unitGoal", label: `${n}+ homes`, value: n, matched: [m[0]] });
    break;
  }

  // Everything left over, grouped by comma or semicolon, minus filler words.
  let rest = "";
  for (let i = 0; i < text.length; i++) {
    rest += used.some((u) => i >= u.start && i < u.end) ? " " : text[i];
  }
  const ignored = rest
    .split(/[,;]/)
    .map((segment) =>
      (segment.match(/[\p{L}\p{N}][\p{L}\p{N}'.+\-]*/gu) ?? [])
        .map((w) => w.replace(/[.+\-]+$/, ""))
        .filter((w) => w && !FILLER.has(w.toLowerCase()))
        .join(" "),
    )
    .filter(Boolean);

  return { patch, understood, ignored };
}

/** Why a query phrase was not used. Plain wording for the UI. */
export function ignoredReason(phrase: string): string {
  if (/transit|bus|rail|train|metro/i.test(phrase)) return "no transit data in this sample";
  if (/afford|income|ami\b/i.test(phrase))
    return "affordability levels are not modelled in this sample";
  return "not a filter in this sample";
}

function inForce(item: UnderstoodItem, state: FilterState): boolean {
  switch (item.key) {
    case "cities":
      return state.cities.includes(item.value as string);
    case "law":
      return state.law === item.value;
    case "owner":
      return state.owner === item.value;
    case "maxAcres":
      return state.maxAcres === item.value;
    case "unitGoal":
      return state.unitGoal === item.value;
  }
}

/**
 * What the query says, split into what is applied right now and what a filter
 * or URL param has overridden.
 */
export function describeQuery(state: FilterState, cities: readonly string[]) {
  const parsed = parseQuery(state.q, cities);
  return {
    understood: parsed.understood.filter((u) => inForce(u, state)),
    overridden: parsed.understood.filter((u) => !inForce(u, state)),
    ignored: parsed.ignored,
  };
}

/** Remove the given substrings from a query and tidy the separators. */
export function stripQueryTerms(q: string, terms: readonly string[]): string {
  let out = q;
  for (const term of terms) {
    const i = out.indexOf(term);
    if (i >= 0) out = out.slice(0, i) + out.slice(i + term.length);
  }
  return out
    .replace(/\s+/g, " ")
    .replace(/\s*([,;])\s*/g, "$1 ")
    .replace(/([,;]\s*)+(?=[,;])/g, "")
    .replace(/^[\s,;]+|[\s,;]+$/g, "")
    .trim();
}

/**
 * Apply a filter change. Any query term that is no longer in force is removed
 * from q, so reloading the URL gives back exactly this state.
 */
export function updateFilters(
  state: FilterState,
  patch: Partial<FilterState>,
  cities: readonly string[],
): FilterState {
  const next = { ...state, ...patch };
  const stale = parseQuery(next.q, cities).understood.filter((u) => !inForce(u, next));
  if (stale.length > 0) next.q = stripQueryTerms(next.q, stale.flatMap((u) => u.matched));
  return next;
}

/** Turn off one understood query term: clear its filter and drop it from q. */
export function removeUnderstood(
  state: FilterState,
  item: UnderstoodItem,
  cities: readonly string[],
): FilterState {
  const patch: Partial<FilterState> = {
    cities: { cities: state.cities.filter((c) => c !== item.value) },
    law: { law: null },
    owner: { owner: null },
    maxAcres: { maxAcres: null },
    unitGoal: { unitGoal: DEFAULT_FILTERS.unitGoal },
  }[item.key];
  const stripped = { ...state, q: stripQueryTerms(state.q, item.matched) };
  return updateFilters(stripped, patch, cities);
}

/** Reset every filter to what the current query implies (q is kept). */
export function resetFilters(state: FilterState, cities: readonly string[]): FilterState {
  return { ...DEFAULT_FILTERS, ...parseQuery(state.q, cities).patch, q: state.q };
}
