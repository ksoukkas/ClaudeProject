/**
 * Scout configuration. Framework-free.
 *
 * Every threshold below is an ASSUMPTION chosen for the prototype, not a rule
 * from any statute or dataset. Each one is shown in the UI and the README.
 */

/** Claude model used to parse the search and draft "why call" lines. */
export const DEFAULT_SCOUT_MODEL = "claude-opus-5-5";

export function scoutModel(): string {
  return process.env.SCOUT_MODEL?.trim() || DEFAULT_SCOUT_MODEL;
}

/** True when a Claude API key is configured. The scout never needs one. */
export function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export const SOURCE_CHECKED = "2026-11-07";

export type Assumption = { id: string; label: string; basis: string };

/**
 * ASSUMPTION: values the team picked. Shown on the results page so nobody
 * mistakes them for rules.
 */
export const ASSUMPTIONS = {
  resultCount: {
    id: "result-count",
    label: "Show the top 10 sites",
    basis:
      "Lane 1 scenario F02 asks for ten sites to call this month. Not a data limit.",
  },
  enrichCount: {
    id: "enrich-count",
    label: "Only the 25 highest-capacity sites are checked for transit and zoning",
    basis:
      "Keeps each search to one small request per public service. Lower-capacity sites are not checked or shown.",
  },
  affordableMeansLower: {
    id: "affordable-means-lower",
    label: "\"Affordable\" with no income level counts lower-income capacity only",
    basis:
      "The SCAG layer splits capacity into lower, moderate and above-moderate income. Lower is the strictest category, so the goal is not overstated.",
  },
  noGoalCap: {
    id: "no-goal-cap",
    label: "With no unit goal, capacity points max out at 100 units",
    basis: "A scale for ranking only. 100 is a round number, not a policy threshold.",
  },
  scoreWeights: {
    id: "score-weights",
    label: "Score = up to 50 points for capacity + up to 30 for transit (only when you ask for transit)",
    basis:
      "Weights are a team choice to make the ranking explainable, not a measure of feasibility. A planned-only transit stop gets 10. Change them in src/lib/scout/config.ts.",
  },
  cacheTtl: {
    id: "cache-ttl",
    label: "Public-data responses are cached in memory for 1 hour",
    basis: "Be kind to public servers (CLAUDE.md). The data does not change hourly.",
  },
} satisfies Record<string, Assumption>;

/** ASSUMPTION: see ASSUMPTIONS.resultCount. */
export const RESULT_COUNT = 10;
/** ASSUMPTION: see ASSUMPTIONS.enrichCount. */
export const ENRICH_COUNT = 25;
/** ASSUMPTION: see ASSUMPTIONS.noGoalCap. */
export const NO_GOAL_CAPACITY_CAP = 100;
/** ASSUMPTION: see ASSUMPTIONS.scoreWeights. */
export const CAPACITY_POINTS = 50;
export const TRANSIT_POINTS = 30;
export const PLANNED_TRANSIT_POINTS = 10;
/** ASSUMPTION: see ASSUMPTIONS.cacheTtl. */
export const CACHE_TTL_MS = 60 * 60 * 1000;

/** Per-request timeout for public services and Claude calls. */
export const FETCH_TIMEOUT_MS = 12_000;
export const CLAUDE_TIMEOUT_MS = 25_000;
