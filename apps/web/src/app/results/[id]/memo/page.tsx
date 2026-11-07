import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfidenceSummary } from "@/components/confidence-breakdown";
import { PrintButton } from "@/components/print-button";
import { Eyebrow, FigmaIcon, StatusTag } from "@/components/ui";
import { sampleConfidence } from "@/lib/sample-checks";
import { SNAPSHOT_DATE, parcels, reports, workspace } from "@/lib/sample-data";
import { CucumberLogo } from "@/components/cucumber-logo";

export const metadata: Metadata = { title: "Site memo" };

const included = [
  "Site essentials & conditional recommendation",
  "All four state-law screens",
  "Zoning and private-title caveats",
  "Confidence, source IDs & next steps",
];

function MemoSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-[10px] text-[11px] leading-[1.5] text-ink">
      <p className="text-[10px] text-accent">{title}</p>
      {children}
    </section>
  );
}

export default async function SiteMemoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const parcel = parcels.find((p) => p.id === id);
  const report = reports[id];
  const result = sampleConfidence(id);
  if (!parcel || !report || !result) notFound();

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-7 px-6 pt-8 pb-12 lg:px-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Link
            href={`/results/${parcel.id}`}
            className="text-[11px] leading-[1.5] text-accent hover:underline"
          >
            ← Back to parcel report
          </Link>
          <h1 className="font-display text-[36px] leading-[1.2] font-semibold text-ink">
            A clear brief for the next conversation.
          </h1>
          <p className="text-[13px] leading-[1.5] text-ink-soft">
            One page. The opportunity, the caveats and the questions to ask.
          </p>
        </div>
        <PrintButton variant="primary" size="md" icon="/figma/memo/download.svg">
          Download PDF
        </PrintButton>
      </div>

      <div className="flex flex-col gap-9 rounded-[24px] bg-canvas p-4 sm:p-7 xl:flex-row xl:items-start">
        <article
          data-print-root
          className="flex w-full max-w-[794px] flex-col gap-5 rounded-[20px] border border-line bg-surface px-6 pt-[42px] pb-[34px] shadow-[0_12px_32px_rgba(0,0,0,0.07)] sm:px-[54px] xl:min-h-[1123px] xl:shrink-0"
        >
          <header className="flex items-center justify-between whitespace-nowrap">
            <CucumberLogo wordmarkSize={24} />
            <p className="text-[9px] tracking-[1.2px] text-accent">SAMPLE ACQUISITION MEMO</p>
          </header>
          <hr className="border-line" />

          <div className="flex flex-col gap-2 leading-[1.5]">
            <h2 className="font-display text-[30px] leading-[1.2] font-semibold text-ink">
              {parcel.address}
            </h2>
            <p className="text-[11px] text-ink-soft">
              {parcel.city}, California · Prepared for {workspace.organization}
            </p>
            <p className="text-[10px] text-ink-soft">
              {SNAPSHOT_DATE} · Fictional site and owner · Screening, not legal advice
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-[16px] bg-canvas p-[18px]">
            <p className="text-[9px] leading-[1.5] text-accent">
              SUGGESTED NEXT STEP · TARGETED DILIGENCE
            </p>
            <p className="font-display text-[20px] leading-[1.2] font-semibold text-ink">
              {report.headline}
            </p>
            <p className="text-[11px] leading-[1.5] text-ink">
              The sample ownership record supports a faith-owned housing
              pathway. A private use covenant and utility easement leave legal
              and physical buildability unresolved. Do not treat this screen as
              a purchase recommendation.
            </p>
          </div>

          <MemoSection title="01 / SITE ESSENTIALS">
            <dl className="grid grid-cols-3 gap-6">
              {[
                ["Land area", `${parcel.acres.toFixed(2)} acres`],
                ["Potential yield", "44–60 homes"],
                ["Owner type", parcel.owner],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col gap-1">
                  <dt className="text-[10px] text-ink-soft">{label}</dt>
                  <dd className="text-[14px] font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            <p>
              Owner: {report.ownerName} · Sample listing: on the market ·
              Transit: 0.3-mile walk (sample). CF / Community facilities is a fictional
              zoning assignment.
            </p>
            <p className="text-[10px] text-ink-soft">
              P-01 parcel + C-01 capacity study. Yield is an early test fit, not
              an entitlement.
            </p>
          </MemoSection>
          <hr className="border-line" />

          <MemoSection title="02 / ELIGIBILITY REASONING">
            <ConfidenceSummary result={result} />
            <p>
              SB 4 — possible fit. Sample deed D-01 shows nonprofit religious
              ownership before the statutory cutoff. Verify ownership,
              affordability, labor standards and all exclusions.
            </p>
            <p>
              SB 9 — fails the sample single-family zoning screen. AB 2011 —
              institutional designation fails the qualifying commercial-zoning
              screen. SB 684 / 1123 — residential designation and subdivision
              conditions are unconfirmed.
            </p>
            <p className="text-[10px] text-ink-soft">
              Sources: Sample deed D-01 (2020), zoning Z-01 and SB 9, SB 684 /
              1123, AB 2011, SB 4 checklists.
            </p>
          </MemoSection>

          <MemoSection title="03 / ZONING & TITLE CAVEATS">
            <p>
              Local zoning: the sample CF code supports civic / religious uses,
              not ordinary apartments. Confirm the SB 4 pathway and applicable
              objective standards with planning staff. Sample Z-01.
            </p>
            <p>
              Title: D-02 limits use to religious purposes. Restriction found —
              may be overridden by state law, verify with attorney. E-01 records
              a 12-foot utility easement on the east edge; impact on yield is
              unverified.
            </p>
            <p>
              HOA: unknown. No covenant appears in sample index T-01, which does
              not prove there is none. A current title report is still required.
            </p>
          </MemoSection>

          <MemoSection title="04 / RECOMMENDED DILIGENCE">
            <ol className="list-inside list-decimal">
              <li>Housing counsel: review D-02 enforceability and any SB 4 override.</li>
              <li>Title / survey: order a preliminary report and map E-01 against a test fit.</li>
              <li>City planning: confirm pathway, standards, fire access and utility capacity.</li>
              <li>Owner: confirm interest, pricing and authority before discussing terms.</li>
            </ol>
          </MemoSection>

          <footer className="mt-auto flex flex-col gap-[10px]">
            <hr className="border-line" />
            <div className="flex justify-between gap-4 text-[9px] leading-[1.5] text-ink-soft">
              <p>Sample acquisition memo · Not legal advice · No legal clearance</p>
              <p>1 / 1</p>
            </div>
          </footer>
        </article>

        <aside className="flex min-w-0 flex-1 flex-col gap-[22px]">
          <div className="flex flex-col items-start gap-[18px] rounded-[16px] border border-line bg-surface p-6">
            <Eyebrow>Ready to take with you</Eyebrow>
            <p className="font-display text-[24px] leading-[1.2] font-semibold text-ink">
              Site memo
            </p>
            <StatusTag size="md" tone="neutral">
              <span className="text-accent">Sample · 1 page</span>
            </StatusTag>
            <hr className="w-full border-line" />
            {[
              ["Format", "A4 · Portrait · PDF"],
              ["Prepared for", workspace.organization],
              ["From report", `${SNAPSHOT_DATE} snapshot`],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col gap-1 leading-[1.5]">
                <p className="text-[10px] text-ink-soft">{label}</p>
                <p className="text-[14px] font-semibold text-ink">{value}</p>
              </div>
            ))}
            <PrintButton
              variant="primary"
              size="md"
              icon="/figma/memo/download.svg"
              className="w-full"
            >
              Download PDF
            </PrintButton>
            <PrintButton size="md" icon="/figma/memo/printer.svg" className="w-full">
              Print preview
            </PrintButton>
          </div>

          <div className="flex flex-col gap-3 p-[22px]">
            <p className="font-display text-[16px] leading-[1.2] font-semibold text-ink">
              Same facts. Easier to share.
            </p>
            {included.map((item) => (
              <p key={item} className="flex items-start gap-[9px] text-[12px] leading-[1.5] text-ink-soft">
                <FigmaIcon src="/figma/memo/check.svg" size={14} className="mt-[2px]" />
                {item}
              </p>
            ))}
          </div>

          <div className="flex flex-col gap-2 rounded-[16px] bg-canvas p-[22px]">
            <FigmaIcon src="/figma/memo/info.svg" size={18} />
            <p className="text-[13px] leading-[1.5] font-semibold text-ink">
              A starting point for diligence.
            </p>
            <p className="text-[12px] leading-[1.5] text-ink-soft">
              Share with your board, planning staff or counsel. This fictional
              memo is not an appraisal, listing or legal opinion.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
