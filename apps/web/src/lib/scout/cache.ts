/**
 * Tiny in-memory TTL cache, per server process. Stores the promise so
 * concurrent identical requests share one upstream call. Failures are not
 * cached.
 */
type Entry = { at: number; value: Promise<unknown> };

const store = new Map<string, Entry>();
const MAX_ENTRIES = 200;

export function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && now - hit.at < ttlMs) return hit.value as Promise<T>;

  const value = load();
  store.set(key, { at: now, value });
  value.catch(() => {
    if (store.get(key)?.value === value) store.delete(key);
  });
  if (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
  return value;
}

export function invalidate(key: string): void {
  store.delete(key);
}
