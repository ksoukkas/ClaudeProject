"use client";

import { useMemo, useState } from "react";
import {
  computeChapter8Evidence,
  computeChapter8Flag,
  inFocusCity,
  parseTaxDefaultedList,
  SYNTHETIC_TAX_LIST_CSV,
  type Chapter8Evidence,
  type Chapter8Flag,
  type Chapter8Status,
  type TaxDefaultedParcel,
} from "@/lib/chapter8";
import { getSource } from "@/lib/feasibility/sources";
import { FOCUS_CITIES, FOCUS_LABEL } from "@/lib/focus";

const FLAG_STYLES: Record<Chapter8Flag["state"], string> = {
  "request-window-open": "border-feasible bg-feasible-soft text-feasible",
  "power-to-sell": "border-accent bg-accent-soft text-accent",
  "auction-passed": "border-line bg-canvas text-ink-soft",
  "redeemed-or-sold": "border-line bg-canvas text-ink-soft",
  "not-known": "border-review bg-review-soft text-review",
};

const LEVEL_STYLES: Record<Chapter8Evidence["level"], string> = {
  High: "border-feasible bg-feasible-soft text-feasible",
  Medium: "border-accent bg-accent-soft text-accent",
  Low: "border-review bg-review-soft text-review",
  "Not enough data": "border-line bg-canvas text-ink-soft",
};

const STATUS_LABELS: Record<Chapter8Status | "all", string> = {
  all: "Any status",
  "scheduled-auction": "Scheduled for auction",
  "power-to-sell": "Power to sell, not scheduled",
  "redeemed-or-sold": "Redeemed or sold",
  unknown: "Unknown",
};

type Row = { p: TaxDefaultedParcel; flag: Chapter8Flag; evidence: Chapter8Evidence };

function SourceLine({ ids }: { ids: string[] }) {
  return (
    <ul className="flex flex-col gap-0.5 text-xs">
      {Array.from(new Set(ids)).map((id) => {
        const s = getSource(id);
        return (
          <li key={id} className="flex flex-wrap items-center gap-1">
            {s.url ? (
              <a href={s.url} target="_blank" rel="noreferrer" className="underline">
                {s.name}
              </a>
            ) : (
              <span>{s.name}</span>
            )}
            <span
              className={`rounded px-1 ${s.status === "VERIFIED" ? "bg-canvas text-ink-soft" : "bg-review-soft text-review"}`}
            >
              {s.status}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function Chapter8Pipeline() {
  const [text, setText] = useState("");
  const [parcels, setParcels] = useState<TaxDefaultedParcel[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [city, setCity] = useState<string>("all");
  const [status, setStatus] = useState<Chapter8Status | "all">("all");
  const [focusOnly, setFocusOnly] = useState(true);
  const today = useMemo(() => new Date(), []);

  const run = (csv: string, synthetic: boolean) => {
    try {
      const list = parseTaxDefaultedList(csv, { synthetic });
      if (list.length === 0) {
        setError("No rows found. The first line must be a header row.");
        setParcels(null);
        return;
      }
      setError(null);
      setParcels(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not parse that text.");
      setParcels(null);
    }
  };

  const rows: Row[] = useMemo(() => {
    if (!parcels) return [];
    return parcels
      .filter((p) => !focusOnly || inFocusCity(p))
      .filter((p) => city === "all" || (p.city ?? "").toLowerCase() === city.toLowerCase())
      .filter((p) => status === "all" || p.status === status)
      .map((p) => ({
        p,
        flag: computeChapter8Flag(p, today),
        evidence: computeChapter8Evidence(p, today),
      }))
      .sort((a, b) => {
        const order: Record<Chapter8Flag["state"], number> = {
          "request-window-open": 0,
          "power-to-sell": 1,
          "not-known": 2,
          "auction-passed": 3,
          "redeemed-or-sold": 4,
        };
        return order[a.flag.state] - order[b.flag.state];
      });
  }, [parcels, focusOnly, city, status, today]);

  const synthetic = parcels?.some((p) => p.synthetic) ?? false;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-soft">
        Download the county&apos;s auction spreadsheet or transcribe its published notice, then
        paste the CSV here. Recognised columns: <code>apn</code>, <code>city</code>,{" "}
        <code>situs</code>, <code>use</code>, <code>default year</code>, <code>min bid</code>,{" "}
        <code>auction date</code>, <code>status</code>, <code>list date</code>. Owner and assessee
        columns are dropped on sight. Nothing leaves your browser.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder="apn,city,situs,use,default year,min bid,auction date,status,list date"
        className="w-full rounded-md border border-line p-2 font-mono text-xs"
        aria-label="County tax-defaulted list CSV"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => run(text, false)}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-surface hover:bg-accent-hover"
        >
          Load list
        </button>
        <button
          type="button"
          onClick={() => {
            setText(SYNTHETIC_TAX_LIST_CSV);
            run(SYNTHETIC_TAX_LIST_CSV, true);
          }}
          className="rounded-md border border-line px-3 py-1.5 text-sm font-medium hover:bg-canvas"
        >
          Load SYNTHETIC sample
        </button>
      </div>
      {error ? <p className="text-sm text-blocked">{error}</p> : null}

      {parcels ? (
        <>
          {synthetic ? (
            <div className="rounded-md border border-review bg-review-soft p-3 text-sm text-review">
              <span className="font-semibold">Synthetic sample.</span> These rows are made up
              (ASSUMPTION). No real parcel, bid or date.
            </div>
          ) : null}
          <div className="flex flex-wrap items-end gap-3 text-sm">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">City</span>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="rounded-md border border-line px-2 py-1"
              >
                <option value="all">All of {FOCUS_LABEL}</option>
                {FOCUS_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">
                Status
              </span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Chapter8Status | "all")}
                className="rounded-md border border-line px-2 py-1"
              >
                {(Object.keys(STATUS_LABELS) as (Chapter8Status | "all")[]).map((k) => (
                  <option key={k} value={k}>
                    {STATUS_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={focusOnly}
                onChange={(e) => setFocusOnly(e.target.checked)}
              />
              <span>Focus cities only</span>
            </label>
            <span className="text-ink-soft">
              {rows.length} of {parcels.length} rows
              {focusOnly ? " (rows outside the focus cities or without a city are hidden)" : ""}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3 font-medium">Chapter 8</th>
                  <th className="py-2 pr-3 font-medium">APN</th>
                  <th className="py-2 pr-3 font-medium">City</th>
                  <th className="py-2 pr-3 font-medium">Site</th>
                  <th className="py-2 pr-3 font-medium">Use</th>
                  <th className="py-2 pr-3 font-medium">Defaulted</th>
                  <th className="py-2 pr-3 font-medium">Min bid</th>
                  <th className="py-2 pr-3 font-medium">Auction</th>
                  <th className="py-2 pr-3 font-medium">Evidence</th>
                  <th className="py-2 font-medium">Why, and sources</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ p, flag, evidence }) => (
                  <tr key={p.id} className="border-b border-line align-top">
                    <td className="py-2 pr-3">
                      <span
                        className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${FLAG_STYLES[flag.state]}`}
                      >
                        {flag.label}
                      </span>
                      {flag.deadline ? (
                        <p className="mt-1 text-xs text-muted">by {flag.deadline}</p>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs">
                      {p.apn ?? "—"}
                      {p.apn && !p.apnNormalized ? (
                        <span className="block text-muted">not matchable</span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3">{p.city ?? "—"}</td>
                    <td className="py-2 pr-3">
                      {p.situsWithheld ? (
                        <span className="text-muted">Reads as a home: address withheld</span>
                      ) : (
                        (p.situs ?? "—")
                      )}
                    </td>
                    <td className="py-2 pr-3">{p.useText ?? "—"}</td>
                    <td className="py-2 pr-3">
                      {p.defaultYear ?? "—"}
                      {p.yearsDelinquent !== null ? (
                        <span className="block text-xs text-muted">
                          about {p.yearsDelinquent} yr{p.yearsDelinquent === 1 ? "" : "s"} by
                          calendar year
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3">
                      {p.minBid !== null ? `$${p.minBid.toLocaleString("en-US")}` : "—"}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">{p.auctionDate ?? "—"}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${LEVEL_STYLES[evidence.level]}`}
                      >
                        {evidence.level}
                      </span>
                      <p className="mt-1 text-xs text-muted">
                        {evidence.resolved} of {evidence.total} facts; {evidence.note}
                      </p>
                    </td>
                    <td className="py-2 text-ink-soft">
                      <p>{flag.reason}</p>
                      <div className="mt-1">
                        <SourceLine ids={flag.sourceIds} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted">
            Confidence here means how much the county list can be trusted for this row: how many
            facts it answers and how fresh it is. It says nothing about whether the parcel is a
            good site. Buildability is the feasibility report&apos;s job once the parcel is in the
            data layer.
          </p>
        </>
      ) : null}
    </div>
  );
}
