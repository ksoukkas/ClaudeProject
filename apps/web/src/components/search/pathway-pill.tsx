import type { PathwayHit } from "@/lib/search/types";
import { StatusTag } from "@/components/ui";
import { STATUS_LABEL, STATUS_TONE } from "./shared";

/** Pathway status pill. The reason shows on hover/focus via the title and below in the panel. */
export function PathwayPill({ hit }: { hit: PathwayHit }) {
  return (
    <span title={`${hit.label}: ${hit.reason}`} className="inline-flex cursor-help">
      <StatusTag tone={STATUS_TONE[hit.status]} shape="pill">
        {hit.label} · {STATUS_LABEL[hit.status]}
      </StatusTag>
    </span>
  );
}
