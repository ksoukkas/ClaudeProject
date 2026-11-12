"use client";

import { useState } from "react";
import Link from "next/link";
import { aerialImageUrl } from "@/lib/search/aerial-url";
import type { AerialRead, SiteResult } from "@/lib/search/types";
import { Button, StatusTag } from "@/components/ui";
import { AERIAL_LABEL_TEXT, SOURCE_COLOR, SOURCE_LABEL, STATUS_LABEL, STATUS_TONE, acresText } from "./shared";

type ReadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; data: AerialRead }
  | { kind: "error" };

export function SitePanel({ site, onClose }: { site: SiteResult; onClose: () => void }) {
  const located = site.lat != null && site.lon != null;
  const [imgFailed, setImgFailed] = useState(false);
  const [read, setRead] = useState<ReadState>({ kind: "idle" });

  const runRead = async () => {
    setRead({ kind: "loading" });
    try {
      const res = await fetch(`/api/aerial-read?id=${encodeURIComponent(site.id)}`);
      if (!res.ok) throw new Error(String(res.status));
      setRead({ kind: "done", data: (await res.json()) as AerialRead });
    } catch {
      setRead({ kind: "error" });
    }
  };

  return (
    <section
      aria-label="Selected site"
      className="flex max-h-full flex-col overflow-hidden rounded-[16px] border border-line bg-surface shadow-lg"
    >
      <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[1.6px] text-ink-soft uppercase">
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: SOURCE_COLOR[site.source] }} />
            {SOURCE_LABEL[site.source]}
          </p>
          <h2 className="font-display text-[18px] leading-[1.25] font-bold text-ink">
            {site.address ?? "Address unknown"}
          </h2>
          <p className="text-[12px] text-ink-soft">
            {site.city ?? "City unknown"} · APN {site.apn ?? "unknown"} · {acresText(site.acres)}
            {site.score != null ? ` · Score ${site.score}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close site panel"
          className="rounded-[10px] border border-line px-2.5 py-1 text-[12px] font-semibold text-ink-soft hover:bg-canvas"
        >
          Close
        </button>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto px-4 py-3">
        {located && !imgFailed ? (
          <div className="overflow-hidden rounded-[12px] border border-line bg-canvas">
            {/* eslint-disable-next-line @next/next/no-img-element -- remote aerial chip */}
            <img
              src={aerialImageUrl(site.lat as number, site.lon as number, 512)}
              alt={`Aerial image of ${site.address ?? "the selected site"}`}
              onError={() => setImgFailed(true)}
              className="aspect-[16/10] w-full object-cover"
            />
          </div>
        ) : (
          <p className="rounded-[12px] border border-line bg-canvas px-3 py-2 text-[12px] text-muted">
            {located ? "Aerial image could not be loaded." : "Not located on the map, so no aerial image."}
          </p>
        )}

        {site.facts.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {site.facts.map((f) => (
              <li key={f}>
                <StatusTag tone="neutral" shape="pill">
                  {f}
                </StatusTag>
              </li>
            ))}
          </ul>
        ) : null}

        <div>
          <h3 className="mb-1.5 text-[10px] font-semibold tracking-[1.6px] text-accent uppercase">Pathways</h3>
          {site.pathways.length === 0 ? (
            <p className="text-[12px] text-muted">No pathway screen for this site: unknown.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {site.pathways.map((p) => (
                <li key={p.id} className="rounded-[10px] border border-line px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-ink">{p.label}</span>
                    <StatusTag tone={STATUS_TONE[p.status]} shape="pill">
                      {STATUS_LABEL[p.status]}
                    </StatusTag>
                  </div>
                  <p className="mt-1 text-[12px] leading-[1.5] text-ink-soft">{p.reason}</p>
                  {p.sourceUrl ? (
                    <a
                      href={p.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-semibold text-accent hover:underline"
                    >
                      Source
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-[12px] border border-line bg-canvas px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[10px] font-semibold tracking-[1.6px] text-accent uppercase">AI aerial read</h3>
            <Button
              variant="secondary-accent"
              onClick={runRead}
              disabled={!located || read.kind === "loading"}
            >
              {read.kind === "loading" ? "Reading..." : read.kind === "done" ? "Read again" : "Read this image"}
            </Button>
          </div>
          <p className="mt-1 text-[11px] leading-[1.5] text-muted">
            An AI model describes what it sees in the image. It is not a site inspection.
          </p>
          {read.kind === "error" ? (
            <p className="mt-2 text-[12px] text-blocked">The AI read could not be reached. Try again later.</p>
          ) : null}
          {read.kind === "done" ? <ReadResult data={read.data} /> : null}
        </div>

        <p className="text-[11px] leading-[1.5] text-muted">
          Source:{" "}
          <a href={site.sourceRef.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
            {site.sourceRef.name}
          </a>
          , checked {site.sourceRef.checkedAt}.
        </p>

        {site.detailHref ? (
          <Link href={site.detailHref} className="text-[13px] font-semibold text-accent hover:underline">
            Open the full details
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function ReadResult({ data }: { data: AerialRead }) {
  if (!data.available) {
    return (
      <p className="mt-2 text-[12px] text-muted">
        The AI read is not available here: it needs an API key (or the site has no coordinates).
      </p>
    );
  }
  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {data.label ? (
        <StatusTag tone="accent" shape="pill" size="md">
          {AERIAL_LABEL_TEXT[data.label]}
        </StatusTag>
      ) : null}
      {data.notes ? <p className="text-[13px] leading-[1.5] text-ink">{data.notes}</p> : null}
      <p className="text-[11px] leading-[1.5] text-muted">{data.caveat}</p>
      <p className="text-[10px] text-muted">
        {data.model ? `Model: ${data.model}. ` : ""}
        {data.readAt ? `Read ${data.readAt}. ` : ""}
        {data.imagery ? (
          <>
            Imagery:{" "}
            <a href={data.imagery.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
              {data.imagery.name}
            </a>
            , checked {data.imagery.checkedAt}.
          </>
        ) : null}
      </p>
    </div>
  );
}
