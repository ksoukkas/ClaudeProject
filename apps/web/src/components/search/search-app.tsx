"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import type { SearchResponse, SiteResult, SiteSource } from "@/lib/search/types";
import { Eyebrow } from "@/components/ui";
import { ResultCard, ResultSkeleton } from "./result-card";
import { SitePanel } from "./site-panel";
import { SOURCE_COLOR, SOURCE_LABEL, SOURCE_ORDER, isSource } from "./shared";

const SiteMap = dynamic(() => import("./site-map"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse rounded-[16px] border border-line bg-canvas" aria-label="Loading map" />
  ),
});

const PAGE_SIZE = 20;

type Filters = { q: string; city: string; source: SiteSource | ""; pathway: string };

function chipClass(active: boolean) {
  return `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
    active ? "border-accent bg-accent text-white" : "border-line bg-surface text-ink-soft hover:bg-canvas"
  }`;
}

function buildQuery(f: Filters, extra: Record<string, string | number> = {}) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.city) p.set("city", f.city);
  if (f.source) p.set("source", f.source);
  if (f.pathway) p.set("pathway", f.pathway);
  for (const [k, v] of Object.entries(extra)) p.set(k, String(v));
  return p;
}

export function SearchApp() {
  const initial = useSearchParams();
  const [filters, setFilters] = useState<Filters>(() => {
    const s = initial.get("source");
    return {
      q: initial.get("q") ?? "",
      city: initial.get("city") ?? "",
      source: isSource(s) ? s : "",
      pathway: initial.get("pathway") ?? "",
    };
  });
  const [debouncedQ, setDebouncedQ] = useState(filters.q);
  const [results, setResults] = useState<SiteResult[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<SearchResponse["facets"]>({ source: {}, city: {} });
  const [warnings, setWarnings] = useState<string[]>([]);
  const [pathwayLabels, setPathwayLabels] = useState<Record<string, string>>({});
  const [doneKey, setDoneKey] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Debounce the text box.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q), 250);
    return () => clearTimeout(t);
  }, [filters.q]);

  const effective = useMemo<Filters>(
    () => ({ ...filters, q: debouncedQ }),
    [filters, debouncedQ],
  );

  // Mirror the search into the URL so it can be shared.
  useEffect(() => {
    const qs = buildQuery(effective).toString();
    window.history.replaceState(null, "", qs ? `/?${qs}` : "/");
  }, [effective]);

  const searchKey = buildQuery(effective).toString();
  const loading = doneKey !== searchKey;

  // Fetch the first page whenever the search changes.
  useEffect(() => {
    const ctl = new AbortController();
    fetch(`/api/search?${buildQuery(effective, { limit: PAGE_SIZE, offset: 0 })}`, { signal: ctl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<SearchResponse>;
      })
      .then((data) => {
        setResults(data.results);
        setTotal(data.total);
        setFacets(data.facets);
        setWarnings(data.warnings ?? []);
        setPathwayLabels((prev) => {
          const next = { ...prev };
          for (const r of data.results) for (const p of r.pathways) next[p.id] = p.label;
          return next;
        });
        setError(false);
        setDoneKey(searchKey);
      })
      .catch((e: unknown) => {
        if ((e as Error)?.name === "AbortError") return;
        setResults([]);
        setTotal(0);
        setError(true);
        setDoneKey(searchKey);
      });
    return () => ctl.abort();
  }, [effective, searchKey]);

  const showMore = async () => {
    setLoadingMore(true);
    try {
      const r = await fetch(
        `/api/search?${buildQuery(effective, { limit: PAGE_SIZE, offset: results.length })}`,
      );
      if (!r.ok) throw new Error(String(r.status));
      const data = (await r.json()) as SearchResponse;
      setResults((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        return [...prev, ...data.results.filter((x) => !seen.has(x.id))];
      });
      setTotal(data.total);
      setPathwayLabels((prev) => {
        const next = { ...prev };
        for (const x of data.results) for (const p of x.pathways) next[p.id] = p.label;
        return next;
      });
    } catch {
      setError(true);
    } finally {
      setLoadingMore(false);
    }
  };

  const update = (patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setSelectedId(null);
  };
  const clearAll = () => {
    setFilters({ q: "", city: "", source: "", pathway: "" });
    setDebouncedQ("");
    setSelectedId(null);
  };
  const hasFilters = !!(filters.q || filters.city || filters.source || filters.pathway);

  const select = useCallback((id: string) => setSelectedId(id), []);
  const selected = results.find((r) => r.id === selectedId) ?? null;
  const cities = Object.entries(facets.city).sort((a, b) => a[0].localeCompare(b[0]));
  const pathwayIds = Object.keys(pathwayLabels).sort();

  return (
    <>
      <section className="border-b border-line bg-canvas">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-6 py-6 lg:px-12">
          <div className="flex flex-col gap-1">
            <Eyebrow>Orange County site search</Eyebrow>
            <h1 className="font-display text-[28px] leading-[1.2] font-bold sm:text-[34px]">
              Find the next site for an affordable home.
            </h1>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">Search by city, address or APN</span>
              <input
                type="search"
                value={filters.q}
                placeholder="Search a city, address or APN"
                autoComplete="off"
                onChange={(e) => update({ q: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setDebouncedQ(filters.q);
                    listRef.current?.querySelector<HTMLElement>("[data-result-card]")?.focus();
                  }
                }}
                className="h-12 w-full rounded-[12px] border border-line-field bg-surface px-4 text-[15px] text-ink placeholder:text-muted focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
              />
            </label>
            <label className="sm:w-60">
              <span className="sr-only">City</span>
              <select
                value={filters.city}
                onChange={(e) => update({ city: e.target.value })}
                className="h-12 w-full rounded-[12px] border border-line-field bg-surface px-3 text-[14px] text-ink focus:border-accent focus:outline-none"
              >
                <option value="">All cities</option>
                {filters.city && !(filters.city in facets.city) ? (
                  <option value={filters.city}>{filters.city}</option>
                ) : null}
                {cities.map(([name, n]) => (
                  <option key={name} value={name}>
                    {name} ({n})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filters">
            {SOURCE_ORDER.map((s) => {
              const active = filters.source === s;
              const n = facets.source[s];
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={active}
                  onClick={() => update({ source: active ? "" : s })}
                  className={chipClass(active)}
                >
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full ring-1 ring-white/70"
                    style={{ background: SOURCE_COLOR[s] }}
                  />
                  {SOURCE_LABEL[s]}
                  {n != null ? <span className="font-normal opacity-80">{n}</span> : null}
                </button>
              );
            })}
            {pathwayIds.length > 0 ? (
              <span aria-hidden className="mx-1 hidden h-5 w-px bg-line sm:block" />
            ) : null}
            {pathwayIds.map((id) => {
              const active = filters.pathway === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => update({ pathway: active ? "" : id })}
                  className={chipClass(active)}
                  title="Sites where this pathway is likely or possible"
                >
                  {pathwayLabels[id]}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[440px_minmax(0,1fr)] lg:px-12">
        <div className="relative order-first h-[340px] lg:sticky lg:top-4 lg:order-last lg:h-[calc(100vh-32px)] lg:min-h-[520px] lg:self-start">
          <SiteMap results={results} selectedId={selectedId} hoveredId={hoveredId} onSelect={select} />
          {selected ? (
            <div className="fixed inset-x-3 bottom-3 z-30 max-h-[75vh] lg:absolute lg:inset-x-auto lg:top-3 lg:right-3 lg:bottom-16 lg:w-[360px] lg:max-h-none">
              <SitePanel key={selected.id} site={selected} onClose={() => setSelectedId(null)} />
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center justify-between gap-3" aria-live="polite">
            <p className="text-[13px] text-ink-soft">
              {loading ? (
                "Searching..."
              ) : (
                <>
                  <span className="font-semibold text-ink">{total.toLocaleString()}</span>{" "}
                  {total === 1 ? "site" : "sites"}
                </>
              )}
            </p>
            {hasFilters ? (
              <button
                type="button"
                onClick={clearAll}
                className="text-[12px] font-semibold text-accent hover:underline"
              >
                Clear
              </button>
            ) : null}
          </div>

          {warnings.length > 0 ? (
            <ul className="rounded-[12px] border border-line bg-review-soft px-3 py-2 text-[12px] text-review">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}

          {error ? (
            <p className="rounded-[12px] border border-line bg-blocked-soft px-3 py-3 text-[13px] text-blocked">
              Search is unavailable right now. Check that the search service is running, then try again.
            </p>
          ) : null}

          <ul ref={listRef} className="flex flex-col gap-2.5">
            {loading
              ? Array.from({ length: 5 }, (_, i) => <ResultSkeleton key={i} />)
              : results.map((site) => (
                  <ResultCard
                    key={site.id}
                    site={site}
                    selected={site.id === selectedId}
                    onSelect={select}
                    onHover={setHoveredId}
                  />
                ))}
          </ul>

          {!loading && !error && results.length === 0 ? (
            <div className="rounded-[16px] border border-dashed border-line-field bg-canvas px-4 py-8 text-center">
              <p className="text-[14px] font-semibold text-ink">No sites match.</p>
              <p className="text-[13px] text-ink-soft">Try a city name or an APN.</p>
            </div>
          ) : null}

          {!loading && results.length < total ? (
            <button
              type="button"
              onClick={showMore}
              disabled={loadingMore}
              className="h-11 rounded-[12px] border border-line bg-surface text-[13px] font-semibold text-accent hover:bg-canvas disabled:opacity-60"
            >
              {loadingMore ? "Loading..." : `Show more (${results.length} of ${total})`}
            </button>
          ) : null}

          <p className="pt-2 text-[11px] leading-[1.5] text-muted">
            Prototype for screening only. Not legal or financial advice. Every result links to its source;
            where a source is silent the answer is unknown.
          </p>
        </div>
      </div>
    </>
  );
}
