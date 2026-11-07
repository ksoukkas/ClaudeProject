/**
 * The scouting agent: free-text search -> criteria -> public data ->
 * ranked, sourced candidates. Never throws; failures come back as a status
 * and a plain-language reason so the UI can fall back honestly.
 *
 * Requests per uncached search: SCAG housing elements (1), Caltrans HQTA
 * (1, only when transit is asked for), SCAG zoning (1), plus up to two
 * Claude calls when ANTHROPIC_API_KEY is set.
 */
import { cached, invalidate } from "./cache";
import { CACHE_TTL_MS, ENRICH_COUNT, hasAnthropicKey, scoutModel } from "./config";
import { explainWithClaude } from "./explain";
import { describeClaudeError, parseQueryWithClaude } from "./parse-claude";
import { parseQueryFallback } from "./parse-fallback";
import { rankCandidates, preselect, type Enrichment } from "./rank";
import { fetchHousingElementSites, fetchTransitForPoints, fetchZoning, SourceError } from "./retrieve";
import type { SourceId } from "./sources";
import type { Criteria, ParserInfo, ScoutResult } from "./types";

export * from "./types";

async function understand(query: string): Promise<{ criteria: Criteria; parser: ParserInfo }> {
  if (!hasAnthropicKey()) {
    return {
      criteria: parseQueryFallback(query),
      parser: { kind: "fallback", model: null, reason: "No ANTHROPIC_API_KEY set" },
    };
  }
  try {
    const criteria = await cached(`parse:${scoutModel()}:${query}`, CACHE_TTL_MS, () =>
      parseQueryWithClaude(query),
    );
    return { criteria, parser: { kind: "claude", model: scoutModel(), reason: null } };
  } catch (error) {
    return {
      criteria: parseQueryFallback(query),
      parser: { kind: "fallback", model: null, reason: describeClaudeError(error) },
    };
  }
}

function sourceMessage(error: unknown): string {
  return error instanceof SourceError ? error.message : "unexpected error reading public data";
}

export function normalizeQuery(q: string): string {
  return q.trim().replace(/\s+/g, " ").slice(0, 300);
}

async function scout(query: string): Promise<ScoutResult> {
  const { criteria, parser } = await understand(query);
  const warnings: string[] = [];
  const sources: SourceId[] = ["scag-he"];
  const base = {
    query,
    criteria,
    parser,
    candidates: [],
    sitesInCity: null,
    explainer: { kind: "template" as const, model: null, note: null },
    generatedAt: new Date().toISOString(),
  };

  if (criteria.ownerHints.length) {
    warnings.push(
      `You asked for ${criteria.ownerHints.join(" / ")} land. Owner type is not in these public layers, so no result is confirmed as that owner type.`,
    );
  }
  if (criteria.affordability.sharePercent != null) {
    warnings.push(
      `Your ${criteria.affordability.sharePercent}% affordability share is recorded but not used: the SCAG layer gives unit capacity by income level, not project shares.`,
    );
  }

  if (!criteria.city) {
    return {
      ...base,
      status: "no-city",
      reason: "No Orange County city found in your search. Name one of OC's 34 cities, for example \"Anaheim\".",
      sources,
      warnings,
    };
  }

  let sites;
  try {
    ({ sites } = await fetchHousingElementSites(criteria.city).then((r) => {
      if (r.truncated) warnings.push("The SCAG service capped the response; some sites may be missing.");
      return r;
    }));
  } catch (error) {
    return { ...base, status: "source-error", reason: sourceMessage(error), sources, warnings };
  }

  if (!sites.length) {
    return {
      ...base,
      sitesInCity: 0,
      status: "city-not-in-layer",
      reason: `The SCAG housing element layer has no sites for ${criteria.city} (checked ${new Date().toISOString().slice(0, 10)}). That does not mean the city has none: check its adopted housing element on HCD's sites inventory page.`,
      sources: [...sources, "hcd-sites"],
      warnings,
    };
  }

  const shortlist = preselect(sites, criteria);
  if (!shortlist.length) {
    return {
      ...base,
      sitesInCity: sites.length,
      status: "no-matches",
      reason: `${criteria.city} has ${sites.length} housing element sites in the SCAG layer, but none list capacity in the income category your search counts.`,
      sources,
      warnings,
    };
  }
  if (sites.length > shortlist.length) {
    warnings.push(
      `${sites.length} sites in ${criteria.city}; only the ${shortlist.length} with the most capacity were checked further (ASSUMPTION: top ${ENRICH_COUNT}).`,
    );
  }

  const enrichment: Enrichment = { transit: null, transitNote: "Not checked: your search did not ask for transit", zoning: null };
  const [transitResult, zoningResult] = await Promise.allSettled([
    criteria.nearTransit === true
      ? fetchTransitForPoints(
          shortlist.filter((s) => s.centroid).map((s) => ({ id: s.pid24, at: s.centroid! })),
        )
      : Promise.resolve(null),
    fetchZoning(shortlist.map((s) => s.pid24)),
  ]);
  if (transitResult.status === "fulfilled" && transitResult.value) {
    enrichment.transit = transitResult.value;
    enrichment.transitNote = "No centroid for this parcel";
    sources.push("caltrans-hqta");
  } else if (transitResult.status === "rejected") {
    enrichment.transitNote = `Caltrans HQTA unavailable (${sourceMessage(transitResult.reason)})`;
    warnings.push(`Transit could not be checked: ${sourceMessage(transitResult.reason)}. Transit is shown as unknown.`);
  }
  if (zoningResult.status === "fulfilled") {
    enrichment.zoning = zoningResult.value;
    sources.push("scag-zoning");
  } else {
    warnings.push(`Zoning could not be read: ${sourceMessage(zoningResult.reason)}. Zoning is shown as unknown.`);
  }

  let candidates = rankCandidates(criteria.city, shortlist, criteria, enrichment);
  let explainer: ScoutResult["explainer"] = {
    kind: "template",
    model: null,
    note: hasAnthropicKey() ? null : "No ANTHROPIC_API_KEY set",
  };
  if (hasAnthropicKey() && candidates.length) {
    try {
      const { lines, rejected } = await explainWithClaude(candidates, criteria);
      candidates = candidates.map((c) =>
        lines.has(c.id) ? { ...c, why: lines.get(c.id)!, whySource: "claude" as const } : c,
      );
      explainer = {
        kind: lines.size ? "claude" : "template",
        model: scoutModel(),
        note: rejected ? `${rejected} Claude line(s) failed the fact check and were replaced by the template` : null,
      };
    } catch (error) {
      explainer = { kind: "template", model: null, note: describeClaudeError(error) };
    }
  }

  return {
    ...base,
    sitesInCity: sites.length,
    status: "ok",
    reason: null,
    candidates,
    sources,
    warnings,
    explainer,
  };
}

/** Run (or reuse, within the cache TTL) a scout for this search. */
export function runScout(rawQuery: string): Promise<ScoutResult> {
  const query = normalizeQuery(rawQuery);
  const key = `scout:${query}`;
  return cached(key, CACHE_TTL_MS, () =>
    scout(query).catch(
      (error): ScoutResult => ({
        query,
        criteria: parseQueryFallback(query),
        parser: { kind: "fallback", model: null, reason: null },
        status: "source-error",
        reason: error instanceof Error ? error.message : "unexpected error",
        candidates: [],
        sitesInCity: null,
        sources: [],
        warnings: [],
        explainer: { kind: "template", model: null, note: null },
        generatedAt: new Date().toISOString(),
      }),
    ),
  ).then((result) => {
    // Do not keep a degraded answer for an hour: retry on the next search.
    if (isDegraded(result)) invalidate(key);
    return result;
  });
}

function isDegraded(r: ScoutResult): boolean {
  return (
    r.status === "source-error" ||
    r.warnings.some((w) => w.startsWith("Transit could not") || w.startsWith("Zoning could not")) ||
    (r.parser.kind === "fallback" && hasAnthropicKey())
  );
}
