"use client";

import Link from "next/link";
import { useState } from "react";
import { SYNTHETIC_PARCELS } from "@/lib/feasibility/fixtures";
import { computeOnMarketFlag } from "@/lib/market/flag";
import {
  listingToSignal,
  parseUploadedListings,
  SYNTHETIC_LISTINGS_CSV,
} from "@/lib/market/listings";
import { getNotice, noticesForApn, noticeToSignal } from "@/lib/market/notices";
import type { OnMarketFlag, UploadedListing } from "@/lib/market/types";

type Row = {
  listing: UploadedListing;
  matchId: string | null;
  matchLabel: string | null;
  flag: OnMarketFlag;
};

const FLAG_STYLES: Record<OnMarketFlag["state"], string> = {
  "public-notice-active": "border-line bg-feasible-soft text-feasible",
  "uploaded-listing": "border-line bg-accent-soft text-accent",
  "public-notice-archived": "border-line bg-canvas text-ink-soft",
  "not-known": "border-line bg-review-soft text-review",
};

export function FlagBadge({ flag }: { flag: OnMarketFlag }) {
  return (
    <span
      className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${FLAG_STYLES[flag.state]}`}
    >
      {flag.label}
    </span>
  );
}

function matchListing(l: UploadedListing): Row {
  const idKey = Object.keys(l.extra).find((k) => ["cucumber_id", "siteline_id"].includes(k.toLowerCase()));
  const id = idKey ? l.extra[idKey] : null;
  let matchId: string | null = null;
  let matchLabel: string | null = null;

  if (id) {
    const fx = SYNTHETIC_PARCELS.find((p) => p.id === id);
    const nt = getNotice(id);
    if (fx) {
      matchId = fx.id;
      matchLabel = fx.label;
    } else if (nt) {
      matchId = nt.id;
      matchLabel = `Surplus notice ${nt.parentCase || nt.id}: ${nt.address || "address not given"}`;
    }
  }

  const notices = noticesForApn(l.apnNormalized);
  if (!matchId && notices.length) {
    matchId = notices[0].id;
    matchLabel = `Surplus notice ${notices[0].parentCase || notices[0].id}: ${notices[0].address || "address not given"}`;
  }

  const flag = computeOnMarketFlag([listingToSignal(l), ...notices.map(noticeToSignal)]);
  return { listing: l, matchId, matchLabel, flag };
}

export function ListingsPaste() {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = (csv: string) => {
    try {
      const listings = parseUploadedListings(csv);
      if (listings.length === 0) {
        setError("No rows found. The first line must be a header row.");
        setRows(null);
        return;
      }
      setError(null);
      setRows(listings.map(matchListing));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not parse that text.");
      setRows(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-soft">
        Paste a CSV from your own broker or MLS export. Recognised columns: <code>apn</code>,{" "}
        <code>address</code>, <code>city</code>, <code>listed</code>, <code>source</code>, and{" "}
        <code>cucumber_id</code> to point at a parcel by id. Nothing leaves your browser and
        Cucumber does not verify the rows.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder="apn,address,city,listed,source"
        className="w-full rounded-md border border-line p-2 font-mono text-xs"
        aria-label="Listings CSV"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => run(text)}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Match listings
        </button>
        <button
          type="button"
          onClick={() => {
            setText(SYNTHETIC_LISTINGS_CSV);
            run(SYNTHETIC_LISTINGS_CSV);
          }}
          className="rounded-md border border-line px-3 py-1.5 text-sm font-medium hover:bg-canvas"
        >
          Load SYNTHETIC sample
        </button>
      </div>
      {error ? <p className="text-sm text-blocked">{error}</p> : null}
      {rows ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-3 font-medium">Your row</th>
                <th className="py-2 pr-3 font-medium">Matched parcel</th>
                <th className="py-2 pr-3 font-medium">Flag</th>
                <th className="py-2 font-medium">Why</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-line align-top">
                  <td className="py-2 pr-3">
                    <p>{[r.listing.address, r.listing.city].filter(Boolean).join(", ") || "—"}</p>
                    <p className="text-xs text-muted">
                      APN {r.listing.apn ?? "—"}
                      {r.listing.apnNormalized ? "" : r.listing.apn ? " (not matchable)" : ""}
                      {r.listing.listedDate ? ` · listed ${r.listing.listedDate}` : ""}
                      {r.listing.source ? ` · ${r.listing.source}` : ""}
                    </p>
                  </td>
                  <td className="py-2 pr-3">
                    {r.matchId ? (
                      <Link href={`/report/${r.matchId}`} className="underline">
                        {r.matchLabel}
                      </Link>
                    ) : (
                      <span className="text-muted">No parcel in Cucumber matches</span>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {r.matchId ? (
                      <FlagBadge flag={r.flag} />
                    ) : (
                      <span className="inline-block rounded border border-line bg-canvas px-2 py-0.5 text-xs font-medium text-ink-soft">
                        No parcel matched
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-ink-soft">
                    {r.matchId
                      ? r.flag.reason
                      : "Your row says this is listed, but no parcel in Cucumber matches it by cucumber_id or APN, so there is nothing to flag yet."}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
