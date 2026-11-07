import type { ReactNode } from "react";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { CONFIDENCE_COPY, levelBody } from "@/lib/confidence";
import type { ConfidenceResult, Outcome, TestGroup, TestRow } from "@/lib/types";

const outcomeStyle: Record<Outcome, { glyph: string; className: string }> = {
  Pass: { glyph: "✓", className: "text-feasible" },
  Fail: { glyph: "×", className: "text-blocked" },
  Unknown: { glyph: "?", className: "text-ink-soft" },
};

function rowSource(row: TestRow): string {
  if (row.sources.length === 0) return "No source yet · Not checked yet";
  const sources = row.sources
    .map((s) => `${s.name} · ${s.dataAsOf ?? "No date stated"}`)
    .join(" / ");
  if (row.rule === "R7") return `${sources} · Replaced by a newer layer`;
  return row.stale && row.asOf ? `${sources} · Past its age limit` : sources;
}

function TestRowItem({ row }: { row: TestRow }) {
  const style = outcomeStyle[row.outcome];
  return (
    <li className="flex gap-3 border-t border-line py-[10px]">
      <span aria-hidden className={`w-3 text-[13px] leading-[1.5] font-semibold ${style.className}`}>
        {style.glyph}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-[2px] leading-[1.5]">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[12px] text-ink">{row.test.label}</p>
          <p className={`text-[11px] font-semibold ${style.className}`}>{row.outcome}</p>
        </div>
        <p className="text-[11px] text-ink-soft">{row.detail}</p>
        <p className="text-[11px] text-ink-soft">
          {rowSource(row)}
          {row.sample ? " · Sample" : ""}
        </p>
      </div>
    </li>
  );
}

function Summary({ result }: { result: ConfidenceResult }) {
  const { pass, fail, unknown } = result.counts;
  return (
    <p className="text-[12px] leading-[1.5] text-ink-soft">
      {result.statusLabel} · {pass} passed · {fail} failed · {unknown} unknown
    </p>
  );
}

const sampleStrip = (
  <p className="rounded-[10px] bg-canvas px-3 py-2 text-[11px] leading-[1.5] text-ink-soft">
    {CONFIDENCE_COPY.sampleStrip}
  </p>
);

/** One short block for the printed memo. */
export function ConfidenceSummary({ result }: { result: ConfidenceResult }) {
  return (
    <div className="flex flex-col gap-1 text-[11px] leading-[1.5] text-ink">
      <div className="flex flex-wrap items-center gap-x-3">
        <ConfidenceBadge level={result.level} />
        <Summary result={result} />
      </div>
      <p className="text-ink-soft">
        {levelBody(result)} Worked out from the tests, not typed in. Cut-offs are an ASSUMPTION.
      </p>
    </div>
  );
}

/** Why a site has its confidence, test by test. */
export function ConfidenceBreakdown({
  result,
  sourceNote,
}: {
  result: ConfidenceResult;
  /** Where the evidence comes from, shown at the foot of the panel. */
  sourceNote?: ReactNode;
}) {
  const groups = [...new Set(result.rows.map((row) => row.test.group))] as TestGroup[];
  const capped = result.level !== result.uncappedLevel;

  return (
    <section
      aria-label="Confidence breakdown"
      className="flex flex-col gap-4 rounded-[16px] border border-line bg-surface p-7"
    >
      {result.rows.some((row) => row.sample) ? sampleStrip : null}

      <div className="flex flex-col gap-[6px]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <ConfidenceBadge level={result.level} />
          <Summary result={result} />
        </div>
        <p className="text-[13px] leading-[1.5] text-ink">{levelBody(result)}</p>
        <p className="text-[11px] leading-[1.5] text-ink-soft">{CONFIDENCE_COPY.meaning}</p>
        {capped ? (
          <p className="text-[11px] leading-[1.5] text-ink-soft">
            {CONFIDENCE_COPY.uncapped(result.uncappedLevel)}
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h2 className="text-[13px] leading-[1.5] font-semibold text-ink">Why</h2>
          <ul className="flex list-inside list-disc flex-col gap-1 text-[12px] leading-[1.5] text-ink">
            {result.why.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        {result.raise.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h2 className="text-[13px] leading-[1.5] font-semibold text-ink">
              {result.status === "Red flag" ? "What would change this" : "What would raise it"}
            </h2>
            <ul className="flex list-inside list-disc flex-col gap-1 text-[12px] leading-[1.5] text-ink">
              {result.raise.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <div key={group} className="flex flex-col gap-1">
            <h3 className="text-[11px] leading-[1.5] font-semibold text-ink-soft">{group}</h3>
            <ul className="flex flex-col">
              {result.rows
                .filter((row) => row.test.group === group)
                .map((row) => (
                  <TestRowItem key={row.test.id} row={row} />
                ))}
            </ul>
          </div>
        ))}
      </div>

      {sourceNote ? (
        <div className="text-[11px] leading-[1.5] text-ink-soft">{sourceNote}</div>
      ) : null}

      <p className="text-[11px] leading-[1.5] text-ink-soft">
        Confidence counts how many tests have evidence. It is not an approval or legal advice.
        ASSUMPTION: no unknowns is High; at least 75% of public tests answered is Medium; at least
        a third is Low; a source past its age limit (30 days for a tax-sale list) drops one step.
      </p>
    </section>
  );
}
