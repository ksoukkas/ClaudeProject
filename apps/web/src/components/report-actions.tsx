"use client";

import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui";

/** Save / export / contact / share row at the bottom of a parcel report. */
export function ReportActions({ memoHref }: { memoHref: string }) {
  const [saved, setSaved] = useState(true);
  const [shared, setShared] = useState(false);

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      setShared(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-[10px]">
      <Button
        size="md"
        icon="/figma/parcel/bookmarkCheck.svg"
        aria-pressed={saved}
        onClick={() => setSaved((s) => !s)}
      >
        {saved ? "Saved" : "Save"}
      </Button>
      <ButtonLink size="md" variant="primary" href={memoHref} icon="/figma/parcel/download.svg">
        Export site memo (PDF)
      </ButtonLink>
      <Button
        size="md"
        icon="/figma/parcel/mail.svg"
        disabled
        title="Prototype: Siteline never contacts owners. Draft outreach yourself."
      >
        Contact owner
      </Button>
      <Button size="md" icon="/figma/parcel/share2.svg" onClick={share}>
        {shared ? "Link copied" : "Share"}
      </Button>
    </div>
  );
}
