"use client";

import Link from "next/link";
import { useState } from "react";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { Button, FigmaIcon, StatusTag, feasibilityLabel } from "@/components/ui";
import { CONFIDENCE_COPY } from "@/lib/confidence";
import { sampleConfidence } from "@/lib/sample-checks";
import { type PipelineCard, alertRules, pipeline } from "@/lib/sample-data";

function CardTitle({ card }: { card: PipelineCard }) {
  return card.parcelId ? (
    <Link href={`/results/${card.parcelId}`} className="hover:text-accent">
      {card.address}
    </Link>
  ) : (
    card.address
  );
}

/** A card with no parcel has never been screened, so it gets no verdict. */
function CardStatus({ card }: { card: PipelineCard }) {
  return card.parcelId ? (
    <StatusTag tone={card.feasibility} shape="soft">
      {feasibilityLabel[card.feasibility]}
    </StatusTag>
  ) : (
    <StatusTag shape="soft">{CONFIDENCE_COPY.notScreened}</StatusTag>
  );
}

function BoardCard({ card }: { card: PipelineCard }) {
  return (
    <article className="flex flex-col gap-[11px] rounded-[14px] border border-line bg-surface p-[17px]">
      <div className="flex items-center justify-between">
        <CardStatus card={card} />
        <FigmaIcon src="/figma/saved/ellipsis.svg" size={16} />
      </div>
      <div className="flex flex-col gap-1 leading-[1.5]">
        <h3 className="font-display text-[18px] leading-[1.2] font-semibold text-ink">
          <CardTitle card={card} />
        </h3>
        <p className="text-[10px] text-ink-soft">{card.city}</p>
        <p className="text-[10px] text-ink-soft">{card.details}</p>
      </div>
      <StatusTag tone="accent" shape="soft">
        {card.pathway}
      </StatusTag>
      <p className="text-[10px] leading-[1.5] text-ink-soft">{card.reasoning}</p>
      <div className="flex flex-col gap-[2px]">
        {card.parcelId ? <ConfidenceBadge level={sampleConfidence(card.parcelId)?.level} /> : null}
        <p className="text-[10px] leading-[1.5] text-ink-soft">{card.evidence}</p>
      </div>
      <div className="flex flex-col gap-2 border-t border-line pt-[10px]">
        <p className="text-[11px] leading-[1.5] text-ink">{card.task}</p>
        <p className="flex items-center gap-[5px] text-[9px] leading-[1.5] text-ink-soft">
          <FigmaIcon src="/figma/saved/calendarDays.svg" size={12} />
          {card.date}
        </p>
      </div>
    </article>
  );
}

export function SavedPipeline() {
  const [view, setView] = useState<"board" | "list">("board");
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(alertRules.map((r) => [r.id, r.enabled])),
  );

  const viewButton = (value: "board" | "list", label: string, icon?: string) => (
    <Button
      variant={view === value ? "primary" : "secondary"}
      icon={icon}
      aria-pressed={view === value}
      onClick={() => setView(value)}
    >
      {label}
    </Button>
  );

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {/* The design only exports a white board icon and a dark list icon. */}
          {viewButton("board", "Board", view === "board" ? "/figma/saved/columns3.svg" : undefined)}
          {viewButton("list", "List", view === "list" ? undefined : "/figma/saved/list.svg")}
          <Button icon="/figma/saved/chevronDown.svg" disabled title="Sample filter">
            All cities
          </Button>
          <Button icon="/figma/saved/chevronDown.svg" disabled title="Sample filter">
            All assignees
          </Button>
        </div>
        <p className="text-[11px] leading-[1.5] text-ink-soft">
          Fictional pipeline · Last updated today
        </p>
      </div>

      {view === "board" ? (
        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {pipeline.map((column) => (
            <section
              key={column.stage}
              className="flex flex-col gap-[14px] rounded-[16px] border border-line bg-surface p-3"
            >
              <div className="flex flex-col gap-[7px] px-[5px] py-[7px]">
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-[13px] leading-[1.5] font-semibold text-ink">
                    <span
                      className={`size-[7px] rounded-[4px] ${
                        column.marker === "warm" ? "bg-[#ff5a1f]" : "bg-accent"
                      }`}
                    />
                    {column.stage}
                  </h2>
                  <StatusTag tone="accent" shape="soft">
                    {column.cards.length}
                  </StatusTag>
                </div>
                <p className="text-[9px] leading-[1.5] text-step-muted">{column.hint}</p>
              </div>
              {column.cards.map((card) => (
                <BoardCard key={card.address} card={card} />
              ))}
              <button
                type="button"
                disabled
                title="Prototype: adding sites is not wired up yet"
                className="flex items-center justify-center gap-[6px] py-2 text-[10px] leading-[1.5] text-step-muted"
              >
                <FigmaIcon src="/figma/saved/plus1.svg" size={13} />
                Add site
              </button>
            </section>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[16px] border border-line bg-surface">
          <table className="w-full min-w-[720px] text-left text-[11px] leading-[1.5]">
            <thead className="text-[10px] text-muted">
              <tr className="border-b border-line">
                {["Site", "Stage", "Status", "Pathway", "Next task", "Date"].map((h) => (
                  <th key={h} className="px-4 py-3 font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pipeline.flatMap((column) =>
                column.cards.map((card) => (
                  <tr key={card.address} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">
                        <CardTitle card={card} />
                      </p>
                      <p className="text-[10px] text-ink-soft">
                        {card.city} · {card.details}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-ink">{column.stage}</td>
                    <td className="px-4 py-3">
                      <CardStatus card={card} />
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{card.pathway}</td>
                    <td className="px-4 py-3 text-ink">{card.task}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-soft">{card.date}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[10px] leading-[1.5] text-ink-soft">
        Pipeline stage is a team workflow, not legal clearance. Open a site
        report for reasoning, confidence and sources. *Juniper Mews capacity is
        pre-title screening only.
      </p>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-[7px]">
            <h2 className="font-display text-[28px] leading-[1.2] font-bold text-ink">
              Let the right sites come to you.
            </h2>
            <p className="text-[12px] leading-[1.5] text-ink-soft">
              Plain-language rules. You choose what changes matter and how we
              tell you.
            </p>
          </div>
          <Button
            size="md"
            icon="/figma/saved/bellPlus.svg"
            disabled
            title="Prototype: alerts are a mock-up and do not send anything"
          >
            Create alert
          </Button>
        </div>

        {alertRules.map((rule) => {
          const on = enabled[rule.id];
          return (
            <div
              key={rule.id}
              className="flex flex-col gap-4 rounded-[16px] border border-line bg-surface p-[22px] lg:flex-row lg:items-center lg:gap-5"
            >
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                  on ? "bg-review-soft" : "bg-canvas"
                }`}
              >
                <FigmaIcon
                  src={on ? "/figma/saved/bellRing.svg" : "/figma/saved/bellOff.svg"}
                  size={17}
                />
              </span>
              <div className="flex flex-1 flex-col gap-[6px] leading-[1.5]">
                <p className="text-[13px] font-medium text-ink">{rule.rule}</p>
                <p className="text-[10px] text-ink-soft">{rule.meta}</p>
              </div>
              <StatusTag tone={on ? "accent" : "neutral"} shape="soft">
                {on ? "Active" : "Paused"}
              </StatusTag>
              <div className="flex w-[150px] flex-col gap-1 leading-[1.5]">
                <p className="text-[10px] text-step-muted">Delivery</p>
                <p className="flex items-center gap-[7px] text-[11px] text-ink">
                  {rule.delivery}
                  <FigmaIcon src="/figma/saved/chevronDown1.svg" size={12} />
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`Alert: ${rule.rule}`}
                onClick={() => setEnabled((prev) => ({ ...prev, [rule.id]: !prev[rule.id] }))}
                className={`flex h-[21px] w-9 shrink-0 rounded-full p-[3px] transition-colors ${
                  on ? "justify-end bg-accent" : "justify-start bg-line"
                }`}
              >
                <span className="size-[15px] rounded-full bg-[#fffefa]" />
              </button>
              <Button disabled title="Prototype: rule editing is not wired up yet">
                Edit rule
              </Button>
            </div>
          );
        })}

        <div className="flex items-center gap-2 text-[10px] leading-[1.5]">
          <FigmaIcon src="/figma/saved/mail.svg" size={14} />
          <p className="flex-1 text-ink-soft">
            Email: maya@harbor-housing.example · In-app notifications enabled ·
            Prototype: nothing is sent
          </p>
          <span className="whitespace-nowrap text-accent">Manage delivery →</span>
        </div>
      </section>
    </>
  );
}
