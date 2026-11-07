import { StatusTag } from "@/components/ui";
import { laws } from "@/lib/sample-data";
import type { Criteria, ParserInfo } from "@/lib/scout/types";

function Chip({ label, value, unknown }: { label: string; value: string; unknown?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-[5px] text-[11px] leading-[1.3] ${
        unknown ? "border-line bg-canvas text-muted" : "border-line bg-surface text-ink"
      }`}
    >
      <span className="text-muted">{label}:</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

function affordabilityText(c: Criteria): { value: string; unknown: boolean } {
  const a = c.affordability;
  if (a.incomeLevel === "lower") return { value: "lower income", unknown: false };
  if (a.incomeLevel === "moderate") return { value: "moderate income", unknown: false };
  if (a.mentioned) return { value: "affordable (counted as lower-income · ASSUMPTION)", unknown: false };
  return { value: "unknown", unknown: true };
}

/** The parsed search as chips, with "unknown" wherever the parser found nothing. */
export function ScoutCriteria({ criteria, parser }: { criteria: Criteria; parser: ParserInfo }) {
  const aff = affordabilityText(criteria);
  const yesNo = (v: boolean | null) => (v === null ? "unknown" : v ? "yes" : "no");
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Chip label="City" value={criteria.city ?? "unknown"} unknown={!criteria.city} />
        <Chip
          label="Unit goal"
          value={criteria.minUnits ? `${criteria.minUnits}+` : "unknown"}
          unknown={!criteria.minUnits}
        />
        <Chip label="Affordability" value={aff.value} unknown={aff.unknown} />
        {criteria.affordability.sharePercent != null ? (
          <Chip label="Share" value={`${criteria.affordability.sharePercent}% (not used)`} />
        ) : null}
        <Chip
          label="Near transit"
          value={yesNo(criteria.nearTransit)}
          unknown={criteria.nearTransit === null}
        />
        <Chip
          label="Pathways"
          value={
            criteria.pathways.length
              ? criteria.pathways.map((id) => laws[id].name).join(", ")
              : "unknown"
          }
          unknown={!criteria.pathways.length}
        />
        <Chip
          label="Owner type"
          value={criteria.ownerHints.length ? criteria.ownerHints.join(", ") : "unknown"}
          unknown={!criteria.ownerHints.length}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[10px] leading-[1.5] text-muted">
        {parser.kind === "claude" ? (
          <StatusTag tone="accent">Parsed by Claude · {parser.model}</StatusTag>
        ) : (
          <StatusTag tone="review">Parsed by keyword rules (fallback)</StatusTag>
        )}
        {parser.reason ? <span>Why: {parser.reason}.</span> : null}
        <span>The parser only reads your words; it adds no facts about sites.</span>
        {criteria.unparsed.map((note) => (
          <span key={note} className="text-review">
            {note}
          </span>
        ))}
      </div>
    </div>
  );
}
