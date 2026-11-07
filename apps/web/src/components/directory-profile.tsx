"use client";

import { useState } from "react";
import { Button, FigmaIcon, StatusTag } from "@/components/ui";
import type { Profile } from "@/lib/sample-data";

/**
 * One landowner or developer card. "Request intro" only records the request
 * on screen: the prototype never contacts anyone.
 */
export function DirectoryProfile({ profile }: { profile: Profile }) {
  const [requested, setRequested] = useState(false);

  return (
    <article className="flex flex-col gap-[14px] rounded-[16px] border border-line bg-surface p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-[42px] shrink-0 items-center justify-center rounded-full bg-line">
          <FigmaIcon src={`/figma/match/${profile.icon}.svg`} size={20} />
        </span>
        <div className="flex flex-1 flex-col gap-1">
          <h3 className="font-display text-[21px] leading-[1.2] font-semibold text-ink">
            {profile.name}
          </h3>
          <p className="text-[10px] leading-[1.5] text-ink-soft">
            {profile.kind} · Fictional organization
          </p>
        </div>
      </div>
      <p className="flex items-center gap-2 text-[11px] leading-[1.5] text-ink-soft">
        <FigmaIcon src="/figma/match/mapPin1.svg" size={13} />
        {profile.location}
      </p>
      <div>
        <StatusTag tone="line-accent">{profile.tag}</StatusTag>
      </div>
      <p className="text-[12px] leading-[1.5] text-ink">{profile.goal}</p>
      <div className="flex flex-col gap-[5px] rounded-[12px] bg-canvas p-[13px] leading-[1.5]">
        <p className="text-[11px] text-ink">{profile.fit}</p>
        <p className="text-[10px] text-ink-soft">
          Profile-reported · Not a vetted match or feasibility conclusion
        </p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] leading-[1.5] text-ink-soft">
          {requested
            ? "Request noted · prototype, nothing was sent"
            : "Sample profile · updated Nov 2026"}
        </p>
        <Button
          variant="secondary-accent"
          icon="/figma/match/arrowUpRight.svg"
          aria-pressed={requested}
          onClick={() => setRequested((r) => !r)}
        >
          {requested ? "Intro requested" : "Request intro"}
        </Button>
      </div>
    </article>
  );
}
