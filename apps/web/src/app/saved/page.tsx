import type { Metadata } from "next";
import { SavedPipeline } from "@/components/saved-pipeline";
import { Button, Eyebrow } from "@/components/ui";
import { workspace } from "@/lib/sample-data";

export const metadata: Metadata = { title: "Saved sites" };

export default function SavedSitesPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-7 px-6 pt-10 pb-11 lg:px-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-[10px]">
          <Eyebrow>From possibility to a plan</Eyebrow>
          <h1 className="font-display text-[40px] leading-[1.2] font-bold text-ink">
            Your sites, moving forward.
          </h1>
          <p className="text-[14px] leading-[1.5] text-ink-soft">
            {workspace.savedCount} saved sites · A shared acquisition pipeline
            for {workspace.organization}
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          icon="/figma/saved/plus.svg"
          disabled
          title="Prototype: adding sites is not wired up yet"
        >
          Add a site
        </Button>
      </div>

      <SavedPipeline />
    </div>
  );
}
