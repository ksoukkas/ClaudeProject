/**
 * Tiny in-memory sliding-window throttle, per server process. Not a security
 * control: it only keeps one client from driving volume at public servers or
 * the Claude API. Limits are an ASSUMPTION (config.ts THROTTLE_*).
 */
export type ThrottleDecision = { ok: boolean; retryAfterSeconds: number };

export function createThrottle(limit: number, windowMs: number, now: () => number = () => Date.now()) {
  const hits = new Map<string, number[]>();
  const MAX_CLIENTS = 1000;

  return function check(client: string): ThrottleDecision {
    const t = now();
    const recent = (hits.get(client) ?? []).filter((at) => t - at < windowMs);
    if (recent.length >= limit) {
      hits.set(client, recent);
      return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((recent[0] + windowMs - t) / 1000)) };
    }
    recent.push(t);
    hits.delete(client);
    hits.set(client, recent);
    while (hits.size > MAX_CLIENTS) {
      const oldest = hits.keys().next().value;
      if (oldest === undefined) break;
      hits.delete(oldest);
    }
    return { ok: true, retryAfterSeconds: 0 };
  };
}
