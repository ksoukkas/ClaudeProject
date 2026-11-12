import { AERIAL_LABELS, isAerialLabel } from "./aerial-reads";
import { SOURCE_LABELS, siteIndex, unlocatedWarning } from "./sites";
import type { SearchParams, SearchResponse, SiteResult, SiteSource } from "./types";

export { aerialImageUrl } from "./aerial-url";
export type * from "./types";
export { isAerialLabel };

export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 200;
const SOURCES: SiteSource[] = ["tax-defaulted", "surplus-notice", "housing-element"];
export const isSiteSource = (v: unknown): v is SiteSource => SOURCES.includes(v as SiteSource);

const AERIAL_WORDS: Record<(typeof AERIAL_LABELS)[number], string> = {
  "vacant-lot": "vacant lot vacant-lot",
  "parking-lot": "parking lot parking-lot",
  "building-intact": "building intact building-intact",
  "building-possibly-distressed": "building distressed possibly distressed building-possibly-distressed",
  unclear: "unclear",
};

const hayCache = new WeakMap<SiteResult, { text: string; apnDigits: string }>();

function haystack(s: SiteResult) {
  let h = hayCache.get(s);
  if (!h) {
    const digits = (s.apn ?? "").replace(/\D/g, "");
    const text = [
      s.apn,
      digits,
      s.city,
      s.address,
      s.source,
      SOURCE_LABELS[s.source],
      ...s.facts,
      ...s.pathways.map((p) => `${p.id} ${p.label}`),
      s.aerial ? `aerial ${AERIAL_WORDS[s.aerial.label]}` : null,
    ]
      .filter(Boolean)
      .join(" | ")
      .toLowerCase();
    h = { text, apnDigits: digits };
    hayCache.set(s, h);
  }
  return h;
}

function matchesTerm(s: SiteResult, term: string): boolean {
  const h = haystack(s);
  if (h.text.includes(term)) return true;
  // APN typed without dashes, or with different dashes.
  if (/^[\d-]+$/.test(term)) {
    const d = term.replace(/-/g, "");
    return d.length >= 3 && h.apnDigits.includes(d);
  }
  return false;
}

function count(map: Record<string, number>, key: string | null) {
  const k = key ?? "Unknown";
  map[k] = (map[k] ?? 0) + 1;
}

function whole(n: number | undefined, fallback: number): number {
  return typeof n === "number" && Number.isFinite(n) ? Math.floor(n) : fallback;
}

/** Order is fixed by the index: tax-defaulted by score, then notices, then housing-element sites. */
export function search(params: SearchParams = {}): SearchResponse {
  const idx = siteIndex();
  const terms = (params.q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const city = params.city?.trim().toLowerCase();
  const pathway = params.pathway?.trim().toLowerCase();
  const limit = Math.min(MAX_LIMIT, Math.max(1, whole(params.limit, DEFAULT_LIMIT)));
  const offset = Math.max(0, whole(params.offset, 0));

  const filtered = idx.sites.filter((s) => {
    if (params.source && s.source !== params.source) return false;
    if (city && (s.city ?? "").toLowerCase() !== city) return false;
    if (params.aerial && s.aerial?.label !== params.aerial) return false;
    if (pathway && !s.pathways.some((p) => p.id.toLowerCase() === pathway && (p.status === "likely" || p.status === "possible"))) {
      return false;
    }
    return terms.every((t) => matchesTerm(s, t));
  });

  const facets: SearchResponse["facets"] = { source: {}, city: {}, aerial: {} };
  for (const s of filtered) {
    count(facets.source, s.source);
    count(facets.city, s.city);
    count(facets.aerial, s.aerial?.label ?? "none");
  }
  const warnings = filtered.some((s) => s.source === "tax-defaulted" && s.lat === null)
    ? [...idx.warnings, unlocatedWarning()]
    : idx.warnings;
  return {
    total: filtered.length,
    results: filtered.slice(offset, offset + limit),
    facets,
    sources: idx.sources,
    warnings,
  };
}

export function getSite(id: string): SiteResult | null {
  return siteIndex().byId.get(id) ?? null;
}
