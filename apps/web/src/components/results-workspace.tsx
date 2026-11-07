"use client";

import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { ParcelMap } from "@/components/parcel-map";
import { LiveShortlist } from "@/components/scout-results";
import { FigmaIcon, StatusTag, feasibilityLabel } from "@/components/ui";
import {
  DEFAULT_FILTERS,
  FEASIBILITIES,
  type FilterState,
  type GoalFit,
  LAW_IDS,
  OWNER_TYPES,
  SORT_KEYS,
  type UnderstoodItem,
  applyFilters,
  countByOption,
  describeQuery,
  goalFit,
  ignoredReason,
  removeUnderstood,
  resetFilters,
  sortLabel,
  sortParcels,
  toSearchParams,
  updateFilters,
} from "@/lib/filters";
import {
  PUBLIC_DATA_URL,
  type PublicSite,
  allCities,
  boundsOf,
  filterPublicSites,
  goalLabel,
  meetsGoal,
  publicCountByCity,
  publicMeta,
  readPublicSites,
} from "@/lib/public-sites";
import { sampleConfidence } from "@/lib/sample-checks";
import { type Feasibility, laws, parcels } from "@/lib/sample-data";
import type { ScoutResult } from "@/lib/scout/types";

/* How many public sites the list shows at first, and per "Show more". */
const PUBLIC_PAGE = 20;
/* The top public sites get numbered pins on the map, matching the list. */
const TOP_PUBLIC = 10;
const planBadge = { meets: "bg-plan-meets", below: "bg-plan-below", unknown: "bg-plan-unknown" };

/* Lot-size presets for the select. A URL can also carry any other range. */
const sizePresets: {
  value: string;
  label: string;
  minAcres: number | null;
  maxAcres: number | null;
}[] = [
  { value: "any", label: "Any acreage", minAcres: null, maxAcres: null },
  { value: "upto-0.5", label: "Up to 0.5 acres", minAcres: null, maxAcres: 0.5 },
  { value: "min-0.5", label: "0.5 acres or more", minAcres: 0.5, maxAcres: null },
  { value: "min-1", label: "1 acre or more", minAcres: 1, maxAcres: null },
];

/* The unit goal is a label, never a filter. "meets" needs no note. */
const goalNote: Partial<Record<GoalFit, (goal: number) => string>> = {
  below: (goal) => `Below ${goal}-unit goal`,
  "may-meet": (goal) => `May meet ${goal}-unit goal`,
  unknown: (goal) => `Yield unknown vs ${goal}-unit goal`,
};

const boxClass =
  "relative flex flex-col gap-[3px] rounded-[10px] border border-line bg-surface px-3 py-[9px] focus-within:border-accent";
const valueClass =
  "w-full cursor-pointer appearance-none truncate bg-transparent pr-4 text-left text-[11px] leading-[1.5] font-medium text-ink outline-none";

function Chevron() {
  return (
    <FigmaIcon
      src="/figma/results/chevronDown.svg"
      size={12}
      className="pointer-events-none absolute right-3 bottom-[13px]"
    />
  );
}

function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className={boxClass}>
      <span className="text-[9px] leading-[1.5] text-muted">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={valueClass}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Chevron />
    </label>
  );
}

/** City filter: a checkbox list in a popover, so several cities can be picked. */
function CityFilter({
  selected,
  counts,
  onChange,
}: {
  selected: string[];
  counts: Record<string, number>;
  onChange: (cities: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const summary =
    selected.length === 0
      ? `All ${allCities.length} cities`
      : selected.length === 1
        ? selected[0]
        : `${selected.length} cities selected`;

  function toggle(city: string) {
    onChange(
      selected.includes(city)
        ? selected.filter((c) => c !== city)
        : allCities.filter((c) => c === city || selected.includes(c)),
    );
  }

  const row =
    "flex cursor-pointer items-center gap-2 rounded-[6px] px-2 py-[6px] text-[11px] text-ink hover:bg-canvas";

  return (
    <div ref={ref} className={boxClass}>
      <span id="city-filter-label" className="text-[9px] leading-[1.5] text-muted">
        City
      </span>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-labelledby="city-filter-label city-filter-value"
        onClick={() => setOpen((o) => !o)}
        className={valueClass}
      >
        <span id="city-filter-value">{summary}</span>
      </button>
      <Chevron />
      {open ? (
        <div
          role="group"
          aria-label="Cities"
          className="absolute top-full left-0 z-30 mt-1 flex max-h-80 w-full min-w-[260px] flex-col gap-px overflow-y-auto rounded-[10px] border border-line bg-surface p-2 shadow-[0_6px_20px_rgba(0,0,0,0.08)]"
        >
          <label className={row}>
            <input
              type="checkbox"
              checked={selected.length === 0}
              onChange={() => onChange([])}
              className="accent-accent"
            />
            All cities
          </label>
          {allCities.map((city) => {
            const sample = counts[city] ?? 0;
            const pub = publicCountByCity[city] ?? 0;
            return (
              <label key={city} className={row}>
                <input
                  type="checkbox"
                  checked={selected.includes(city)}
                  onChange={() => toggle(city)}
                  className="accent-accent"
                />
                <span className="flex-1">{city}</span>
                <span className="text-[10px] text-muted">
                  {pub} public{sample ? ` · ${sample} sample` : ""}
                </span>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/** Commits whenever the box holds a whole number from 1 to 10,000. */
function GoalInput({ goal, onChange }: { goal: number; onChange: (goal: number) => void }) {
  const [draft, setDraft] = useState(String(goal));
  const [shown, setShown] = useState(goal);
  if (goal !== shown) {
    // The goal changed elsewhere (reset, chip removed): show the new value.
    setShown(goal);
    setDraft(String(goal));
  }
  return (
    <label className="flex items-center gap-[6px] text-[11px] text-muted">
      Unit goal
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={10000}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          const n = Number(e.target.value);
          if (e.target.value !== "" && Number.isInteger(n) && n >= 1 && n <= 10_000) onChange(n);
        }}
        onBlur={() => setDraft(String(goal))}
        className="w-16 rounded-[6px] border border-line bg-surface px-2 py-[3px] text-[11px] text-ink outline-none focus:border-accent"
      />
    </label>
  );
}

function Chip({
  children,
  onRemove,
  label,
}: {
  children: ReactNode;
  onRemove: () => void;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface py-[3px] pr-1 pl-3 text-[11px] leading-[1.4] text-ink">
      {children}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="flex size-[18px] items-center justify-center rounded-full text-[13px] leading-none text-muted hover:bg-canvas hover:text-ink"
      >
        ×
      </button>
    </span>
  );
}

export function ResultsWorkspace({
  initial,
  understood: initialUnderstood,
  ignored: initialIgnored,
  children,
  live,
  liveIntro,
}: {
  initial: FilterState;
  understood: UnderstoodItem[];
  ignored: string[];
  /** Page heading, rendered above the query line. */
  children?: ReactNode;
  /** Live scout result for the search text, when it returned sites. */
  live?: ScoutResult | null;
  /** Server-rendered scout banner and parsed criteria, shown under the query. */
  liveIntro?: ReactNode;
}) {
  const [filters, setFilters] = useState(initial);
  const [saved, setSaved] = useState<Set<string>>(new Set(["olive-commons"]));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [allPublic, setAllPublic] = useState<PublicSite[] | null>(null);
  const [publicError, setPublicError] = useState<string | null>(null);
  const [selectedPublicId, setSelectedPublicId] = useState<number | null>(null);
  const [publicShown, setPublicShown] = useState(PUBLIC_PAGE);
  const [showSample, setShowSample] = useState(true);
  const [showPublic, setShowPublic] = useState(true);

  // The real Housing Element sites, cached as a static file (about 600 KB).
  useEffect(() => {
    let cancelled = false;
    fetch(PUBLIC_DATA_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setAllPublic(readPublicSites(data));
      })
      .catch((err: unknown) => {
        if (!cancelled) setPublicError(err instanceof Error ? err.message : "failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the URL in step with the filters, without a server round trip. Skip
  // the initial state (it came from the URL; strict mode runs this twice, so a
  // "first render" flag is not enough) and anything that would not change it.
  useEffect(() => {
    if (filters === initial) return;
    const qs = toSearchParams(filters).toString();
    if (qs === window.location.search.replace(/^\?/, "")) return;
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, [filters, initial]);

  // What the query says. The server already worked this out for the first render.
  const query = useMemo(() => {
    const described = describeQuery(filters, allCities);
    return filters === initial
      ? { ...described, understood: initialUnderstood, ignored: initialIgnored }
      : described;
  }, [filters, initial, initialUnderstood, initialIgnored]);

  const visible = useMemo(
    () => sortParcels(applyFilters(parcels, filters), filters.sort),
    [filters],
  );
  const visibleIds = useMemo(() => new Set(visible.map((p) => p.id)), [visible]);

  // Only the city filter applies to the public sites (see filterPublicSites).
  const publicVisible = useMemo(
    () => (allPublic ? filterPublicSites(allPublic, filters.cities) : null),
    [allPublic, filters.cities],
  );
  const publicHomes = useMemo(
    () => (publicVisible ?? []).reduce((sum, s) => sum + (s.totalCapacity ?? 0), 0),
    [publicVisible],
  );
  // Live scout candidates found in the cached public layer (same SCAG source),
  // matched by APN. Their map squares carry the scout's rank.
  const liveOnMap = useMemo(() => {
    const idByCandidate = new Map<string, number>();
    const sites: PublicSite[] = [];
    const numbers: number[] = [];
    if (!live || !allPublic) return { idByCandidate, sites, numbers };
    const byApn = new Map<string, PublicSite>();
    for (const s of allPublic) {
      if (s.apn) byApn.set(s.apn, s);
      if (s.apn24) byApn.set(s.apn24, s);
    }
    for (const c of live.candidates) {
      const site = byApn.get(c.apn) ?? byApn.get(c.apn.replace(/-/g, ""));
      if (!site) continue;
      idByCandidate.set(c.id, site.id);
      sites.push(site);
      numbers.push(c.rank);
    }
    return { idByCandidate, sites, numbers };
  }, [live, allPublic]);
  const topPublic = useMemo(
    () => (live ? liveOnMap.sites : (publicVisible ?? []).slice(0, TOP_PUBLIC)),
    [live, liveOnMap, publicVisible],
  );

  // Frame the searched area: every site in the chosen cities (both layers),
  // or the whole county when no city is chosen. Refit only when the cities
  // change or the public data arrives.
  const focus = useMemo(() => {
    const chosen = new Set(filters.cities);
    const samples = parcels
      .filter((p) => chosen.size === 0 || chosen.has(p.city))
      .map((p) => p.position);
    const bounds = boundsOf([...samples, ...(publicVisible ?? [])]);
    if (!bounds) return null;
    return { key: `${filters.cities.join("|")}:${allPublic ? "all" : "samples"}`, bounds };
  }, [filters.cities, publicVisible, allPublic]);

  const publicMeetGoal = useMemo(
    () => (publicVisible ?? []).filter((s) => meetsGoal(s, filters.unitGoal)).length,
    [publicVisible, filters.unitGoal],
  );

  const counts = useMemo(
    () => ({
      cities: countByOption(parcels, filters, "cities"),
      law: countByOption(parcels, filters, "law"),
      owner: countByOption(parcels, filters, "owner"),
      status: countByOption(parcels, filters, "status"),
      market: countByOption(parcels, filters, "onMarketOnly"),
    }),
    [filters],
  );

  const set = (patch: Partial<FilterState>) => {
    setFilters((prev) => updateFilters(prev, patch, allCities));
    setPublicShown(PUBLIC_PAGE);
  };

  // Pin clicked: highlight it and bring its card into view.
  const handlePinSelect = useCallback((id: string) => {
    setSelectedId(id);
    document.getElementById(`site-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  // Public dot clicked: show it in the list (paging further if needed).
  const handlePublicSelect = useCallback(
    (id: number | null) => {
      setSelectedPublicId(id);
      if (id === null || !publicVisible) return;
      const index = publicVisible.findIndex((s) => s.id === id);
      if (index >= 0) setPublicShown((n) => Math.max(n, index + 1));
      // A live scout site scrolls to its shortlist card; others to the public list.
      const liveCandidate = [...liveOnMap.idByCandidate].find(([, pid]) => pid === id)?.[0];
      requestAnimationFrame(() =>
        document
          .getElementById(liveCandidate ? `live-${liveCandidate}` : `public-${id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
      );
    },
    [publicVisible, liveOnMap],
  );

  const toggleLayer = useCallback((layer: "sample" | "public") => {
    if (layer === "sample") setShowSample((v) => !v);
    else setShowPublic((v) => !v);
  }, []);

  const count = (f: Feasibility) => visible.filter((p) => p.feasibility === f).length;

  const sizeValue =
    sizePresets.find((s) => s.minAcres === filters.minAcres && s.maxAcres === filters.maxAcres)
      ?.value ?? "custom";
  const sizeOptions = [
    ...sizePresets.map((s) => ({
      value: s.value,
      label: `${s.label} (${
        applyFilters(parcels, { ...filters, minAcres: s.minAcres, maxAcres: s.maxAcres }).length
      })`,
    })),
    ...(sizeValue === "custom"
      ? [
          {
            value: "custom",
            label: `${filters.minAcres ?? 0}–${filters.maxAcres ?? "any"} acres (${visible.length})`,
          },
        ]
      : []),
  ];

  const goalFromQuery = query.understood.some((u) => u.key === "unitGoal");
  const selectedHidden =
    selectedId !== null && !visibleIds.has(selectedId)
      ? parcels.find((p) => p.id === selectedId)
      : undefined;

  function toggleSaved(id: string) {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <div className="flex flex-col gap-[10px]">
        {children}
        <p className="text-[14px] leading-[1.5] text-ink-soft">
          {filters.q || "No search text: showing every sample site."}
        </p>

        {filters.q ? (
          <div className="flex flex-col gap-[6px]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] leading-[1.5] text-muted">Understood:</span>
              {query.understood.length === 0 ? (
                <span className="text-[11px] leading-[1.5] text-ink-soft">
                  nothing yet. Try a city name, “faith-owned”, “commercial”, “small” or a
                  number of homes.
                </span>
              ) : (
                query.understood.map((u) => (
                  <Chip
                    key={`${u.key}-${u.value}`}
                    label={u.label}
                    onRemove={() => setFilters((prev) => removeUnderstood(prev, u, allCities))}
                  >
                    {u.label}
                  </Chip>
                ))
              )}
            </div>
            {query.ignored.length > 0 ? (
              <p className="text-[11px] leading-[1.5] text-muted">
                Not used:{" "}
                {query.ignored.map((phrase, i) => (
                  <span key={`${phrase}-${i}`}>
                    {i > 0 ? " · " : null}
                    <span className="text-ink-soft">{phrase}</span> ({ignoredReason(phrase)})
                  </span>
                ))}
              </p>
            ) : null}
            {query.overridden.length > 0 ? (
              <p className="text-[11px] leading-[1.5] text-muted">
                Overridden by filters: {query.overridden.map((u) => u.label).join(" · ")}
              </p>
            ) : null}
          </div>
        ) : null}

        <p className="text-[11px] leading-[1.5] text-muted">
          Two kinds of sites: five fictional sample sites with a full screen, and{" "}
          {publicMeta.recordCount.toLocaleString()} real Housing Element sites from SCAG across
          Orange County, shown as published. Your search sets the filters below; sites under
          your unit goal stay visible and are labelled, not hidden.
        </p>
        {liveIntro}
      </div>

      <div className="flex w-full flex-col gap-[10px]">
        <div className="grid w-full grid-cols-2 gap-[10px] md:grid-cols-3 xl:grid-cols-6">
          <CityFilter
            selected={filters.cities}
            counts={counts.cities}
            onChange={(cities) => set({ cities })}
          />
          <SelectFilter
            label="Law"
            value={filters.law ?? ""}
            onChange={(v) => set({ law: LAW_IDS.find((id) => id === v) ?? null })}
            options={[
              { value: "", label: `All pathways (${counts.law.all})` },
              ...LAW_IDS.map((id) => ({
                value: id,
                label: `${laws[id].name} (${counts.law[id] ?? 0})`,
              })),
            ]}
          />
          <SelectFilter
            label="Owner type"
            value={filters.owner ?? ""}
            onChange={(v) => set({ owner: OWNER_TYPES.find((o) => o === v) ?? null })}
            options={[
              { value: "", label: `All owners (${counts.owner.all})` },
              ...OWNER_TYPES.map((o) => ({ value: o, label: `${o} (${counts.owner[o] ?? 0})` })),
            ]}
          />
          <SelectFilter
            label="Lot size"
            value={sizeValue}
            onChange={(v) => {
              const preset = sizePresets.find((s) => s.value === v);
              if (preset) set({ minAcres: preset.minAcres, maxAcres: preset.maxAcres });
            }}
            options={sizeOptions}
          />
          <SelectFilter
            label="Market status"
            value={filters.onMarketOnly ? "on" : "off"}
            onChange={(v) => set({ onMarketOnly: v === "on" })}
            options={[
              { value: "off", label: `On-market only: Off (${counts.market.off})` },
              { value: "on", label: `On-market only: On (${counts.market.on})` },
            ]}
          />
          <SelectFilter
            label="Feasibility"
            value={filters.status ?? ""}
            onChange={(v) => set({ status: FEASIBILITIES.find((f) => f === v) ?? null })}
            options={[
              { value: "", label: `All statuses (${counts.status.all})` },
              ...FEASIBILITIES.map((f) => ({
                value: f,
                label: `${feasibilityLabel[f]} (${counts.status[f] ?? 0})`,
              })),
            ]}
          />
        </div>
        <div className="flex items-center justify-between gap-4 text-[11px] leading-[1.5]">
          <p className="text-ink-soft">
            {visible.length} of {parcels.length} sample sites · {count("feasible")} look
            good · {count("review")} need checking · {count("blocked")} with a red flag
            {publicVisible ? (
              <>
                {" "}· {publicVisible.length.toLocaleString()} public Housing Element sites
                {filters.cities.length > 0 ? " in the chosen cities" : ""}
              </>
            ) : null}
          </p>
          <button
            type="button"
            onClick={() => setFilters((prev) => resetFilters(prev, allCities))}
            className="shrink-0 text-[10px] text-accent hover:underline"
            title="Clear filters back to what your search says"
          >
            Reset filters
          </button>
        </div>
      </div>

      <div className="flex w-full flex-col gap-7 lg:flex-row lg:items-start">
        <div id="results-map" className="flex w-full scroll-mt-6 flex-col lg:w-[612px] lg:shrink-0">
          <ParcelMap
            parcels={parcels}
            visibleIds={visibleIds}
            selectedId={selectedId}
            onSelect={handlePinSelect}
            publicSites={publicVisible}
            publicError={publicError}
            selectedPublicId={selectedPublicId}
            onSelectPublic={handlePublicSelect}
            showSample={showSample}
            showPublic={showPublic}
            onToggleLayer={toggleLayer}
            unitGoal={filters.unitGoal}
            topPublic={topPublic}
            topNumbers={live ? liveOnMap.numbers : undefined}
            focus={focus}
          />
          <div className="flex flex-col gap-[6px] py-3 text-[10px] leading-[1.5] text-ink-soft">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              <span className="font-semibold text-ink">Sample sites (round pins, screened):</span>
              {FEASIBILITIES.map((f) => (
                <span key={f} className="flex items-center gap-[5px]">
                  <span
                    className={`size-[9px] rounded-full ${
                      f === "feasible" ? "bg-feasible" : f === "review" ? "bg-review" : "bg-blocked"
                    }`}
                  />
                  {feasibilityLabel[f]}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              <span className="font-semibold text-ink">
                Public sites (square pins and dots, not screened):
              </span>
              <span className="flex items-center gap-[5px]">
                <span className="size-[9px] rounded-[3px] bg-plan-meets" />
                Plans {filters.unitGoal}+ homes
              </span>
              <span className="flex items-center gap-[5px]">
                <span className="size-[9px] rounded-[3px] bg-plan-below" />
                Fewer than {filters.unitGoal}
              </span>
              <span className="flex items-center gap-[5px]">
                <span className="size-[9px] rounded-[3px] bg-plan-unknown" />
                Capacity unknown
              </span>
            </div>
            <p className="text-muted">
              {live
                ? `Numbered squares are the live scout's ranked sites, with the same numbers as the shortlist${
                    liveOnMap.sites.length < live.candidates.length
                      ? ` (${live.candidates.length - liveOnMap.sites.length} not in the map snapshot)`
                      : ""
                  }. Square colour uses total planned homes vs the goal; the scout's goal check may count lower-income capacity only (ASSUMPTION).`
                : `Numbered squares are the top ${TOP_PUBLIC} public sites by planned homes, as in the list.`}{" "}
              Bigger dots plan more homes; grey circles with a number are clusters, click to
              zoom in. The map zooms to the cities in your search.
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-[12px] bg-canvas p-5">
            <p className="font-display text-[14px] leading-[1.2] text-ink">
              A promising law is only the first layer.
            </p>
            <p className="text-[12px] leading-[1.5] text-ink-soft">
              A parcel can pass state-law screening and still face a title
              restriction. Open a report to see the evidence and the unknowns.
            </p>
          </div>
          <p className="py-4 text-[10px] leading-[1.5] text-muted">
            Sample coverage: Anaheim, Santa Ana, Buena Park, Garden Grove and Fullerton. Pin
            numbers match the ranked list. Sample pins sit near each city’s centre for
            illustration only; they are not real parcels.
          </p>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {live ? (
            <div className="mb-4 border-b border-line pb-6">
              <LiveShortlist
                result={live}
                mapIdByCandidate={liveOnMap.idByCandidate}
                mapLoaded={allPublic !== null || publicError !== null}
                selectedMapId={selectedPublicId}
                onShowOnMap={(id) => {
                  // Select the square (the map flies to it) and bring the map into view.
                  setShowPublic(true);
                  setSelectedPublicId(id);
                  document
                    .getElementById("results-map")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              />
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 leading-[1.5] whitespace-nowrap">
            <p className="text-[12px] font-semibold text-ink">Sites in sample order</p>
            <div className="flex flex-wrap items-center gap-4">
              <GoalInput goal={filters.unitGoal} onChange={(unitGoal) => set({ unitGoal })} />
              <label className="flex items-center gap-[6px] text-[11px] text-muted">
                Sort
                <select
                  value={filters.sort}
                  onChange={(e) =>
                    set({ sort: SORT_KEYS.find((k) => k === e.target.value) ?? "fit" })
                  }
                  className="cursor-pointer rounded-[6px] border border-line bg-surface px-2 py-[3px] text-[11px] text-ink outline-none focus:border-accent"
                >
                  {SORT_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {sortLabel[k]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          {!goalFromQuery && filters.unitGoal === DEFAULT_FILTERS.unitGoal ? (
            <p className="-mt-2 text-[10px] leading-[1.5] text-muted">
              ASSUMPTION: the {DEFAULT_FILTERS.unitGoal}-unit goal is the default from the
              Scout example query. It only labels sites; it never hides them.
            </p>
          ) : null}

          {selectedHidden ? (
            <p className="rounded-[10px] bg-canvas px-4 py-3 text-[11px] leading-[1.5] text-ink-soft">
              Site {selectedHidden.rank} ({selectedHidden.address}) is hidden by the current
              filters.
            </p>
          ) : null}

          {visible.length === 0 ? (
            <p className="rounded-[12px] border border-dashed border-line bg-surface p-6 text-[12px] text-ink-soft">
              No sample sites match these filters.
            </p>
          ) : null}

          {visible.map((p) => {
            const isSaved = saved.has(p.id);
            const result = sampleConfidence(p.id);
            const isSelected = p.id === selectedId;
            const note = goalNote[goalFit(p, filters.unitGoal)]?.(filters.unitGoal);
            return (
              <article
                key={p.id}
                id={`site-${p.id}`}
                onFocus={() => setSelectedId(p.id)}
                onClick={() => setSelectedId(p.id)}
                className={`relative flex scroll-mt-6 flex-col gap-[10px] rounded-[12px] border bg-surface p-5 transition-colors hover:border-accent ${
                  isSelected
                    ? "border-accent ring-2 ring-accent/25"
                    : isSaved
                      ? "border-review"
                      : "border-line"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-[7px]">
                    <span className="text-[10px] leading-[1.5] text-muted">
                      {String(p.rank).padStart(2, "0")}
                    </span>
                    <StatusTag tone={p.feasibility}>
                      {result?.statusLabel ?? feasibilityLabel[p.feasibility]}
                    </StatusTag>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSaved(p.id)}
                    aria-pressed={isSaved}
                    aria-label={isSaved ? `Unsave ${p.address}` : `Save ${p.address}`}
                    className="relative z-10 rounded p-1 hover:bg-canvas"
                  >
                    <FigmaIcon
                      src={
                        isSaved
                          ? "/figma/results/bookmarkCheck.svg"
                          : "/figma/results/bookmark.svg"
                      }
                      size={16}
                    />
                  </button>
                </div>
                <div className="flex flex-col gap-[3px]">
                  <h2 className="font-display text-[21px] leading-[1.2] font-semibold text-ink">
                    <Link
                      href={`/results/${p.id}`}
                      className="after:absolute after:inset-0 after:content-['']"
                    >
                      {p.address}
                    </Link>
                  </h2>
                  <p className="text-[11px] leading-[1.5] text-ink-soft">
                    {p.city} · {p.acres.toFixed(2)} acres · {p.owner}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusTag>{laws[p.law].name}</StatusTag>
                  <span className="text-[12px] leading-[1.5] font-semibold text-ink">
                    {p.yieldLabel}
                  </span>
                  {note ? (
                    <span className="text-[10px] leading-[1.5] text-ink-soft">{note}</span>
                  ) : null}
                </div>
                {p.onMarket ? (
                  <div className="flex items-center gap-[7px]">
                    <StatusTag tone="review">On the market</StatusTag>
                    <span className="text-[9px] leading-[1.5] text-review">
                      New law pathway · sample listing
                    </span>
                  </div>
                ) : null}
                <p className="text-[12px] leading-[1.5] text-ink">{p.reasoning}</p>
                <div className="flex items-center gap-[10px]">
                  <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                    <div className="flex flex-wrap items-center gap-x-3">
                      <ConfidenceBadge level={result?.level} />
                      {result ? (
                        <span className="text-[11px] leading-[1.5] text-ink-soft">
                          {result.counts.unknown} of {result.counts.total} tests unknown
                        </span>
                      ) : null}
                    </div>
                    {result ? (
                      <p className="text-[11px] leading-[1.5] text-ink-soft">
                        Next: {result.next}
                      </p>
                    ) : null}
                    <p className="text-[10px] leading-[1.5] text-muted">{p.evidence}</p>
                  </div>
                  <FigmaIcon src="/figma/results/arrowUpRight.svg" size={16} />
                </div>
              </article>
            );
          })}

          <p className="text-[10px] leading-[1.5] text-muted">
            Unit ranges are early capacity estimates, not entitlements. *Red flag
            site shows pre-title screening capacity.
          </p>

          <section
            aria-labelledby="public-sites-heading"
            className="mt-4 flex flex-col gap-3 border-t border-line pt-6"
          >
            <div className="flex flex-col gap-1">
              <h2
                id="public-sites-heading"
                className="font-display text-[21px] leading-[1.2] font-semibold text-ink"
              >
                Public Housing Element sites
              </h2>
              <p className="text-[11px] leading-[1.5] text-ink-soft">
                {publicVisible
                  ? `${publicVisible.length.toLocaleString()} sites · ${publicHomes.toLocaleString()} planned homes · ${publicMeetGoal.toLocaleString()} plan ${filters.unitGoal}+ homes${
                      filters.cities.length > 0
                        ? ` · ${filters.cities.join(", ")}`
                        : " · all of Orange County"
                    }`
                  : publicError
                    ? `Could not load the public sites (${publicError}).`
                    : "Loading public sites…"}
              </p>
              <p className="text-[10px] leading-[1.5] text-muted">
                Real parcels that cities listed in their adopted housing elements, from{" "}
                <a
                  href={publicMeta.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline"
                >
                  SCAG
                </a>{" "}
                (checked {publicMeta.checked}). Only the city filter applies: the source has no
                law, owner, lot size, listing or feasibility data. Santa Ana has no sites in this
                source. Largest planned capacity first.
              </p>
            </div>

            {!showPublic ? (
              <p className="rounded-[10px] bg-canvas px-4 py-3 text-[11px] text-ink-soft">
                The public layer is hidden on the map.{" "}
                <button
                  type="button"
                  onClick={() => setShowPublic(true)}
                  className="text-accent hover:underline"
                >
                  Show it
                </button>
              </p>
            ) : null}

            {publicVisible && publicVisible.length === 0 ? (
              <p className="rounded-[12px] border border-dashed border-line bg-surface p-6 text-[12px] text-ink-soft">
                No public Housing Element sites in the chosen cities.
              </p>
            ) : null}

            {publicVisible && publicVisible.length > 0 ? (
              <ul className="flex flex-col overflow-hidden rounded-[12px] border border-line bg-surface">
                {publicVisible.slice(0, publicShown).map((site, index) => {
                  const isSelected = site.id === selectedPublicId;
                  const goal = meetsGoal(site, filters.unitGoal);
                  const label = goalLabel(site, filters.unitGoal);
                  return (
                    <li
                      key={site.id}
                      id={`public-${site.id}`}
                      className="scroll-mt-6 border-b border-line last:border-0"
                    >
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => {
                          setShowPublic(true);
                          handlePublicSelect(isSelected ? null : site.id);
                        }}
                        className={`flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-canvas ${
                          isSelected ? "bg-accent-soft" : ""
                        }`}
                      >
                        {!live && index < TOP_PUBLIC ? (
                          <span
                            aria-hidden
                            className={`flex size-[22px] shrink-0 items-center justify-center rounded-[6px] text-[10px] font-bold text-white ${planBadge[label]}`}
                          >
                            {index + 1}
                          </span>
                        ) : (
                          <span
                            aria-hidden
                            className={`ml-[7px] size-[8px] shrink-0 rounded-full ${planBadge[label]}`}
                          />
                        )}
                        <span className="flex min-w-0 flex-1 flex-col leading-[1.5]">
                          <span className="text-[12px] font-semibold text-ink">{site.city}</span>
                          <span className="text-[10px] text-muted">
                            APN {site.apn ?? "unknown"}
                            {site.year ? ` · ${site.year}` : ""}
                          </span>
                        </span>
                        <span className="flex flex-col items-end leading-[1.5]">
                          <span className="text-[12px] font-semibold text-ink">
                            {site.totalCapacity === null
                              ? "Capacity unknown"
                              : `${site.totalCapacity.toLocaleString()} planned homes`}
                          </span>
                          <span className="text-[10px] text-muted">
                            {site.lowIncomeCapacity ?? 0} lower-income
                            {goal === false ? ` · below ${filters.unitGoal}` : ""}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {publicVisible && publicShown < publicVisible.length ? (
              <button
                type="button"
                onClick={() => setPublicShown((n) => n + PUBLIC_PAGE)}
                className="self-start text-[11px] text-accent hover:underline"
              >
                Show {Math.min(PUBLIC_PAGE, publicVisible.length - publicShown)} more (
                {(publicVisible.length - publicShown).toLocaleString()} remaining)
              </button>
            ) : null}
          </section>
        </div>
      </div>
    </>
  );
}
