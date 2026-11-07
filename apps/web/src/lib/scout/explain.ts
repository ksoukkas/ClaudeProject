/**
 * Optional: Claude drafts a 1-2 sentence "why call about this site" line,
 * using ONLY the structured facts we pass. Each line is validated; anything
 * that fails keeps the deterministic template sentence.
 */
import Anthropic from "@anthropic-ai/sdk";
import { CLAUDE_TIMEOUT_MS, scoutModel } from "./config";
import { normalizeNumbers } from "./parse-fallback";
import { unitGoal } from "./rank";
import type { Criteria, ScoutCandidate } from "./types";

/** The only facts Claude sees for a candidate. */
export function factsFor(c: ScoutCandidate, criteria: Criteria) {
  return {
    id: c.id,
    city: c.city,
    apn: c.apn,
    address: "unknown",
    housingElementYear: c.capacity.year,
    lowerIncomeCapacity: c.capacity.lower,
    moderateIncomeCapacity: c.capacity.moderate,
    aboveModerateCapacity: c.capacity.aboveModerate,
    totalCapacity: c.capacity.total,
    unitsCountedTowardGoal: c.goalBasis.units,
    countedAs: c.goalBasis.label,
    userUnitGoal: unitGoal(criteria),
    meetsGoal: c.meetsGoal,
    acres: c.acres.value,
    localZoningCode: c.zoning.value,
    inHighQualityTransitArea:
      c.transit.value === "unknown" ? "unknown" : c.transit.value.inHqta && !c.transit.value.plannedOnly,
    owner: "unknown",
    hazards: "unknown",
    utilities: "unknown",
    pathwayEligibility: "unknown",
  };
}

const SYSTEM = `You write one or two plain sentences telling a small nonprofit's acquisitions lead why a parcel may be worth a phone call.

Hard rules:
- Use only the facts in the JSON for that parcel. Do not add any fact, number, address, owner, law, price or date.
- Every number you write must appear in that parcel's JSON.
- If a fact is "unknown" or null, say it is unknown or leave it out. Never guess.
- Owner, hazards, utilities and pathway eligibility are unknown for every parcel; mention that at least one key unknown remains.
- Mention transit only if inHighQualityTransitArea is true or false. Do not say what a zoning code means (e.g. "commercial"). Do not describe the owner or land use.
- No vague quantities ("dozens", "hundreds"). No legal or financial advice. No superlatives. Under 60 words per parcel.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "why"],
        properties: { id: { type: "string" }, why: { type: "string" } },
      },
    },
  },
} as const;

const TRANSIT_WORDS = /\b(transit|stations?|rail|metrolink|trains?|bus(?:es)?|brt|hqta|light[-\s]rail)\b/i;
const ZONING_WORDS = /\b(zon(?:e|es|ed|ing))\b/i;
/** Words that interpret or invent a fact; allowed only if a fact value contains them. */
const CLAIM_WORDS = [
  "commercial",
  "residential",
  "mixed-use",
  "mixed use",
  "industrial",
  "single-family",
  "multifamily",
  "church",
  "faith",
  "congregation",
  "religious",
  "school",
  "college",
  "university",
  "city-owned",
  "county-owned",
  "state-owned",
  "publicly owned",
  "public land",
  "nonprofit",
  "non-profit",
  "vacant",
  "for sale",
];
const VAGUE_QUANTITIES =
  /\b(dozens|hundreds|thousands|scores of|several|numerous|a lot of|lots of|many)\b/i;

/**
 * Accept a Claude sentence only if:
 * - every number in it appears in the facts (thousands separators ignored),
 * - it has no currency and is short,
 * - it mentions transit only when the transit fact is known (true/false),
 * - it mentions zoning only when a zoning code is known,
 * - it uses no owner / land-use / availability claim word that is absent
 *   from the fact values, and no vague quantity ("dozens", "hundreds").
 * This is a mechanical check, not a full fact check. Exported for tests.
 */
export function validateWhy(text: unknown, facts: Record<string, unknown>): string | null {
  if (typeof text !== "string") return null;
  const t = text.trim().replace(/\s+/g, " ");
  if (!t || t.length > 420 || /[$€£¥]/.test(t)) return null;

  const values = Object.values(facts);
  const valueText = values
    .filter((v): v is string => typeof v === "string")
    .join(" | ")
    .toLowerCase();
  const allowed = new Set<number>();
  for (const v of values) {
    if (typeof v === "number") allowed.add(v);
    if (typeof v === "string") {
      for (const m of normalizeNumbers(v).match(/\d+(?:\.\d+)?/g) ?? []) allowed.add(Number(m));
    }
  }
  for (const m of normalizeNumbers(t).match(/\d+(?:\.\d+)?/g) ?? []) {
    if (!allowed.has(Number(m))) return null;
  }

  const lower = t.toLowerCase();
  if (TRANSIT_WORDS.test(t) && typeof facts.inHighQualityTransitArea !== "boolean") return null;
  if (ZONING_WORDS.test(t) && (!facts.localZoningCode || facts.localZoningCode === "unknown")) return null;
  if (CLAIM_WORDS.some((w) => lower.includes(w) && !valueText.includes(w))) return null;
  if (VAGUE_QUANTITIES.test(t)) return null;
  return t;
}

export async function explainWithClaude(
  candidates: ScoutCandidate[],
  criteria: Criteria,
): Promise<{ lines: Map<string, string>; rejected: number; model: string }> {
  const facts = candidates.map((c) => factsFor(c, criteria));
  const client = new Anthropic({ timeout: CLAUDE_TIMEOUT_MS, maxRetries: 1 });
  const response = await client.beta.messages.create({
    model: scoutModel(),
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Write one "why call" line per parcel. Return the same ids.\n\n${JSON.stringify(facts)}`,
      },
    ],
  });
  if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") {
    throw new Error(`Claude stopped: ${response.stop_reason}`);
  }
  const text = response.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const parsed = JSON.parse(text) as { items?: { id?: unknown; why?: unknown }[] };
  const byId = new Map(facts.map((f) => [f.id, f]));
  const lines = new Map<string, string>();
  let rejected = 0;
  for (const item of parsed.items ?? []) {
    const f = typeof item.id === "string" ? byId.get(item.id) : undefined;
    if (!f) continue;
    const ok = validateWhy(item.why, f);
    if (ok) lines.set(f.id, ok);
    else rejected++;
  }
  return { lines, rejected, model: response.model || scoutModel() };
}
