/**
 * Query understanding with Claude. Server-only in practice (it reads
 * ANTHROPIC_API_KEY), but framework-free.
 *
 * Claude only turns the user's words into criteria. It is never asked for,
 * and never trusted with, facts about a site. The output is checked against
 * a strict JSON schema and then sanitized: the city must be one of the 34 OC
 * cities, and any number must literally appear in the query.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { LawId } from "../sample-data";
import { OC_CITIES, toOcCity } from "./cities";
import { CLAUDE_TIMEOUT_MS, scoutModel } from "./config";
import type { Criteria, IncomeLevel, OwnerHint } from "./types";

const LAW_IDS: LawId[] = ["SB9", "SB684_SB1123", "AB2011", "SB4"];
const OWNER_HINTS: OwnerHint[] = ["faith", "public", "commercial"];

const CRITERIA_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "city",
    "minUnits",
    "affordable",
    "incomeLevel",
    "sharePercent",
    "nearTransit",
    "pathways",
    "ownerHints",
    "unparsed",
  ],
  properties: {
    city: { anyOf: [{ type: "string", enum: [...OC_CITIES] }, { type: "null" }] },
    minUnits: { anyOf: [{ type: "integer" }, { type: "null" }] },
    affordable: { type: "boolean" },
    incomeLevel: { anyOf: [{ type: "string", enum: ["lower", "moderate"] }, { type: "null" }] },
    sharePercent: { anyOf: [{ type: "number" }, { type: "null" }] },
    nearTransit: { anyOf: [{ type: "boolean" }, { type: "null" }] },
    pathways: { type: "array", items: { type: "string", enum: LAW_IDS } },
    ownerHints: { type: "array", items: { type: "string", enum: OWNER_HINTS } },
    unparsed: { type: "array", items: { type: "string" } },
  },
} as const;

const SYSTEM = `You turn a housing developer's search into structured criteria for a site-scouting tool in Orange County, California.

Rules:
- Only parse what the user wrote. Do not add facts about any parcel, law, number or place.
- city: one of the 34 Orange County cities listed in the schema, only if the user named it. "Orange County" alone is not the City of Orange. Otherwise null.
- minUnits: a unit or home count the user stated (e.g. "40+ units" -> 40). Otherwise null. Never estimate.
- affordable: true if the user asked for affordable, income-restricted or below-market homes.
- incomeLevel: "lower" for low, very low or lower income; "moderate" for moderate income; otherwise null.
- sharePercent: a percentage the user stated (e.g. "20% affordable"). Otherwise null.
- nearTransit: true if they asked to be near transit, rail, a station or frequent bus; false if they asked to avoid it; otherwise null.
- pathways: state-law pathways they named or clearly described: SB9 (lot splits, duplexes), SB684_SB1123 (small-lot subdivisions), AB2011 (commercial corridors), SB4 (faith or nonprofit-college land).
- ownerHints: owner types they asked for: faith, public, commercial.
- unparsed: short notes on anything in the query you could not map to a field. Empty if none.`;

export class ClaudeParseError extends Error {}

/** Keep only values the query supports. Shared by tests. */
export function sanitizeClaudeCriteria(raw: unknown, query: string): Criteria {
  if (!raw || typeof raw !== "object") throw new ClaudeParseError("Claude returned no object");
  const r = raw as Record<string, unknown>;
  const numbersInQuery = new Set((query.match(/\d+(?:\.\d+)?/g) ?? []).map(Number));
  const notes: string[] = [];

  const city = toOcCity(r.city);
  if (r.city != null && !city) notes.push(`Ignored city "${String(r.city)}" (not one of the 34 OC cities)`);

  let minUnits: number | null = null;
  if (typeof r.minUnits === "number" && Number.isInteger(r.minUnits) && r.minUnits > 0) {
    if (numbersInQuery.has(r.minUnits)) minUnits = r.minUnits;
    else notes.push(`Ignored unit count ${r.minUnits} (not in your search text)`);
  }

  let sharePercent: number | null = null;
  if (typeof r.sharePercent === "number" && r.sharePercent > 0 && r.sharePercent <= 100) {
    if (numbersInQuery.has(r.sharePercent)) sharePercent = r.sharePercent;
    else notes.push(`Ignored percentage ${r.sharePercent} (not in your search text)`);
  }

  const incomeLevel: IncomeLevel | null =
    r.incomeLevel === "lower" || r.incomeLevel === "moderate" ? r.incomeLevel : null;

  const pathways = Array.isArray(r.pathways)
    ? LAW_IDS.filter((id) => (r.pathways as unknown[]).includes(id))
    : [];
  const ownerHints = Array.isArray(r.ownerHints)
    ? OWNER_HINTS.filter((h) => (r.ownerHints as unknown[]).includes(h))
    : [];
  const unparsed = Array.isArray(r.unparsed)
    ? (r.unparsed as unknown[]).filter((s): s is string => typeof s === "string").slice(0, 5)
    : [];

  return {
    city,
    minUnits,
    affordability: { mentioned: r.affordable === true, incomeLevel, sharePercent },
    nearTransit: typeof r.nearTransit === "boolean" ? r.nearTransit : null,
    pathways,
    ownerHints,
    unparsed: [...unparsed.map((s) => s.slice(0, 200)), ...notes],
  };
}

export async function parseQueryWithClaude(query: string): Promise<Criteria> {
  const client = new Anthropic({ timeout: CLAUDE_TIMEOUT_MS, maxRetries: 1 });
  const response = await client.beta.messages.create({
    model: scoutModel(),
    max_tokens: 2000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: CRITERIA_SCHEMA },
    },
    system: SYSTEM,
    messages: [{ role: "user", content: query.slice(0, 500) }],
  });

  if (response.stop_reason === "refusal") throw new ClaudeParseError("Claude declined the request");
  if (response.stop_reason === "max_tokens") throw new ClaudeParseError("Claude output was cut off");
  const text = response.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ClaudeParseError("Claude returned invalid JSON");
  }
  return sanitizeClaudeCriteria(parsed, query);
}

/** Short, user-safe description of why a Claude call failed. */
export function describeClaudeError(error: unknown): string {
  if (error instanceof ClaudeParseError) return error.message;
  if (error instanceof Anthropic.AuthenticationError) return "Claude API key was rejected";
  if (error instanceof Anthropic.RateLimitError) return "Claude API rate limit";
  if (error instanceof Anthropic.APIConnectionTimeoutError) return "Claude API timed out";
  if (error instanceof Anthropic.APIConnectionError) return "Could not reach the Claude API";
  if (error instanceof Anthropic.APIError) return `Claude API error ${error.status ?? ""}`.trim();
  return "Claude call failed";
}
