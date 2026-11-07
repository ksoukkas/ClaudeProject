import { CONFIDENCE_COPY } from "@/lib/confidence";
import type { Level } from "@/lib/types";

const filled: Record<Level, number> = {
  High: 3,
  Medium: 2,
  Low: 1,
  "Not enough data": 0,
};

/**
 * Word plus a three-step meter. It is not coloured by level on purpose: red for
 * Low would clash with a Red flag at High confidence. No level means the site
 * was never screened.
 */
export function ConfidenceBadge({ level }: { level?: Level }) {
  const steps = level ? filled[level] : 0;
  return (
    <span className="inline-flex shrink-0 items-center gap-[6px] text-[11px] leading-[1.5] font-semibold whitespace-nowrap text-ink">
      <span aria-hidden className="flex gap-[2px]">
        {[0, 1, 2].map((step) => (
          <span
            key={step}
            className={`h-[6px] w-[12px] rounded-[2px] ${step < steps ? "bg-accent" : "bg-line"}`}
          />
        ))}
      </span>
      {level ? CONFIDENCE_COPY.badge[level] : CONFIDENCE_COPY.notScreened}
    </span>
  );
}
