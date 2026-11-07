/**
 * The scouting agent: free-text search -> criteria -> public data ->
 * ranked, sourced candidates. Never throws; failures come back as a status
 * and a plain-language reason so the UI can fall back honestly.
 *
 * Requests per uncached search: SCAG housing elements (1), Caltrans HQTA
 * (1, only when transit is asked for), SCAG zoning (1), plus up to two
 * Claude calls when ANTHROPIC_API_KEY is set.
 */
import { cached } from "./cache";
import {
  CACHE_TTL_MS,
  DEGRADED_CACHE_TTL_MS,
  ENRICH_COUNT,
  hasAnthropicKey,
  scoutModel,
} from "./config";
import { explainWithClaude } from "./explain";
import { describeClaudeError, parseQueryWithClaude } from "./parse-claude";
import { parseQueryFallback } from "./parse-fallback";
import { goalBasis, preselect, rankCandidates, type Enrichment } from "./rank";
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
    const { criteria, model } = await cached(`parse:${scoutModel()}:${query}`, CACHE_TTL_MS, () =>
      parseQueryWithClaude(query),
    );
    return { criteria, parser: { kind: "claude", model, reason: null } };
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
  // Claude parse failed even though a key is set.
  let degraded = parser.kind === "fallback" && hasAnthropicKey();
  const base = {
    query,
    criteria,
    parser,
    candidates: [],
    sitesInCity: null,
    explainer: { kind: "template" as const, model: null, note: null },
    generatedAt: new Date().toISOString(),
  };

  if (criteria.nearTransit === false) {
    warnings.push(
      "Your search asks to avoid transit. The scout does not rank by distance from transit, so transit is not scored.",
    );
  }
  if (criteria.ownerHints.length) {
    warnings.push(
      `You asked for owner type: ${criteria.ownerHints.join(", ")}. Owner type is not in these public layers, so no result is confirmed as that owner type.`,
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
      degraded,
    };
  }

  let sites;
  try {
    const he = await fetchHousingElementSites(criteria.city);
    sites = he.sites;
    if (he.truncated) {
      degraded = true;
      warnings.push("The SCAG service capped the response; some sites may be missing.");
    }
    if (he.duplicates) {
      warnings.push(
        `${he.duplicates} duplicate SCAG record(s) for the same parcel id were skipped (the first was kept).`,
      );
    }
  } catch (error) {
    return { ...base, status: "source-error", reason: sourceMessage(error), sources, warnings, degraded: true };
  }

  if (!sites.length) {
    return {
      ...base,
      sitesInCity: 0,
      status: "city-not-in-layer",
      reason: `The SCAG housing element layer has no sites for ${criteria.city} (checked ${new Date().toISOString().slice(0, 10)}). That does not mean the city has none: check its adopted housing element on HCD's sites inventory page.`,
      sources: [...sources, "hcd-sites"],
      warnings,
      degraded,
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
      degraded,
    };
  }
  const eligible = sites.filter((s) => goalBasis(criteria, s).units > 0).length;
  const basisLabel = goalBasis(criteria, shortlist[0]).label;
  warnings.push(
    `${sites.length} housing element sites in ${criteria.city}; ${eligible} list any ${basisLabel}.` +
      (eligible > shortlist.length
        ? ` Only the ${shortlist.length} with the most were checked for transit and zoning (ASSUMPTION: at most ${ENRICH_COUNT}).`
        : ""),
  );

  const enrichment: Enrichment = {
    transit: null,
    transitNote:
      criteria.nearTransit === false
        ? "Not scored: your search asks to avoid transit"
        : "Not checked: your search did not ask for transit",
    zoning: null,
  };
  const [transitResult, zoningResult] = await Promise.allSettled([
    criteria.nearTransit === true
      ? fetchTransitForPoints(
          shortlist.filter((s) => s.centroid).map((s) => ({ id: s.pid24, at: s.centroid! })),
        )
      : Promise.resolve(null),
    fetchZoning(shortlist.filter((s) => s.idField === "PID24").map((s) => s.pid24)),
  ]);
  if (transitResult.status === "fulfilled" && transitResult.value) {
    enrichment.transit = transitResult.value.facts;
    sources.push("caltrans-hqta");
    if (transitResult.value.truncated) {
      degraded = true;
      enrichment.transitNote =
        "Caltrans HQTA response was truncated, so \"not in an HQTA\" could not be confirmed (or no centroid)";
      warnings.push(
        "The Caltrans HQTA service truncated its response. Sites inside a returned area are marked; the rest show transit as unknown.",
      );
    } else {
      enrichment.transitNote = "No centroid for this parcel";
    }
  } else if (transitResult.status === "rejected") {
    degraded = true;
    enrichment.transitNote = `Caltrans HQTA unavailable (${sourceMessage(transitResult.reason)})`;
    warnings.push(`Transit could not be checked: ${sourceMessage(transitResult.reason)}. Transit is shown as unknown.`);
  }
  if (zoningResult.status === "fulfilled") {
    enrichment.zoning = zoningResult.value.records;
    enrichment.zoningTruncated = zoningResult.value.truncated;
    sources.push("scag-zoning");
    if (zoningResult.value.truncated) {
      degraded = true;
      warnings.push(
        "The SCAG zoning service truncated its response. Parcels without a returned record show zoning as unknown.",
      );
    }
  } else {
    degraded = true;
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
      const { lines, rejected, model } = await explainWithClaude(candidates, criteria);
      candidates = candidates.map((c) =>
        lines.has(c.id) ? { ...c, why: lines.get(c.id)!, whySource: "claude" as const } : c,
      );
      explainer = {
        kind: lines.size ? "claude" : "template",
        model,
        note: rejected ? `${rejected} Claude line(s) failed the automatic check and were replaced by the template` : null,
      };
    } catch (error) {
      degraded = true;
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
    degraded,
  };
}

/**
 * Run (or reuse) a scout for this search. Healthy results are cached for
 * CACHE_TTL_MS; degraded ones for DEGRADED_CACHE_TTL_MS, so a failing source
 * is retried soon but not on every request.
 */
export function runScout(rawQuery: string): Promise<ScoutResult> {
  const query = normalizeQuery(rawQuery);
  return cached(
    `scout:${query}`,
    CACHE_TTL_MS,
    () =>
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
          degraded: true,
          generatedAt: new Date().toISOString(),
        }),
      ),
    (result) => (result.degraded ? DEGRADED_CACHE_TTL_MS : CACHE_TTL_MS),
  );
}
