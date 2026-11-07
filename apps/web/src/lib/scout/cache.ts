/**
 * Tiny in-memory TTL cache, per server process. Stores the promise so
 * concurrent identical requests share one upstream call. Failures are not
 * cached. Insertion order is recency of the last write, so the oldest write
 * is evicted first.
 */
type Entry = { at: number; ttl: number; value: Promise<unknown> };

const store = new Map<string, Entry>();
const MAX_ENTRIES = 200;
let now: () => number = () => Date.now();

/**
 * Return the cached promise for `key`, or start `load()`. When `ttlFor` is
 * given, the entry's TTL is replaced by `ttlFor(value)` once it resolves (for
 * example a short TTL for a degraded answer).
 */
export function cached<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
  ttlFor?: (value: T) => number,
): Promise<T> {
  const hit = store.get(key);
  if (hit && now() - hit.at < hit.ttl) return hit.value as Promise<T>;

  const value = load();
  const entry: Entry = { at: now(), ttl: ttlMs, value };
  store.delete(key);
  store.set(key, entry);
  value.then(
    (v) => {
      if (ttlFor && store.get(key) === entry) entry.ttl = ttlFor(v);
    },
    () => {
      if (store.get(key) === entry) store.delete(key);
    },
  );
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
  return value;
}

/** Compare-and-delete: with `value`, only removes the entry holding that promise. */
export function invalidate(key: string, value?: Promise<unknown>): void {
  const entry = store.get(key);
  if (entry && (value === undefined || entry.value === value)) store.delete(key);
}

/** Test hooks. Not used by the app. */
export const cacheTesting = {
  setClock(fn: () => number) {
    now = fn;
  },
  resetClock() {
    now = () => Date.now();
  },
  clear() {
    store.clear();
  },
  size() {
    return store.size;
  },
  keys() {
    return [...store.keys()];
  },
};
