import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ParcelContextMap } from "@/components/parcel-context-map";
import { ReportActions } from "@/components/report-actions";
import {
  ButtonLink,
  Eyebrow,
  FigmaIcon,
  StatusTag,
  feasibilityLabel,
} from "@/components/ui";
import {
  type Finding,
  SNAPSHOT_DATE,
  parcels,
  reports,
  workspace,
} from "@/lib/sample-data";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const parcel = parcels.find((p) => p.id === id);
  return { title: parcel ? parcel.address : "Parcel report" };
}

function SectionHeading({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-accent">{number}</span>
        <h2 className="font-display text-[25px] leading-[1.2] font-semibold text-ink">
          {title}
        </h2>
      </div>
      <p className="text-[12px] leading-[1.5] text-muted">{description}</p>
    </div>
  );
}

function FindingNotes({ finding }: { finding: Finding }) {
  return (
    <>
      <p className="text-[12px] leading-[1.5] text-ink">{finding.body}</p>
      <p className="text-[10px] leading-[1.5] text-muted">{finding.confidence}</p>
      {finding.link ? (
        <a
          href={finding.link.href}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] leading-[1.5] text-accent hover:underline"
        >
          {finding.link.label}
        </a>
      ) : null}
    </>
  );
}

/** Zoning and title rows: heading with the status tag on the right. */
function DiligenceCheck({ finding }: { finding: Finding }) {
  return (
    <div className="flex flex-col gap-[9px] border-t border-line py-[18px]">
      <div className="flex items-center justify-between gap-4">
        <h3 className="flex-1 text-[13px] leading-[1.5] font-semibold text-ink">
          {finding.title}
        </h3>
        <StatusTag tone={finding.tone} solid shape="soft">
          {finding.status}
        </StatusTag>
      </div>
      <FindingNotes finding={finding} />
    </div>
  );
}

export default async function ParcelReportPage({ params }: { params: Params }) {
  const { id } = await params;
  const parcel = parcels.find((p) => p.id === id);
  if (!parcel) notFound();
  const report = reports[id];

  const crumbs = (
    <div className="flex items-center gap-2">
      <FigmaIcon src="/figma/parcel/arrowLeft.svg" size={14} />
      <p className="flex-1 text-[11px] leading-[1.5] text-accent">
        <Link href="/results" className="hover:underline">
          Results
        </Link>{" "}
        / {parcel.city} / Parcel report
      </p>
      <p className="text-[10px] leading-[1.5] whitespace-nowrap text-muted">
        Sample report · Updated {SNAPSHOT_DATE}
      </p>
    </div>
  );

  if (!report) {
    return (
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-7 px-6 pt-8 pb-10 lg:px-20">
        {crumbs}
        <h1 className="font-display text-[42px] leading-[1.2] font-bold text-ink">
          {parcel.address}
        </h1>
        <div className="flex flex-col gap-3 rounded-[16px] border border-dashed border-line bg-surface p-7">
          <StatusTag tone={parcel.feasibility}>{feasibilityLabel[parcel.feasibility]}</StatusTag>
          <p className="text-[13px] leading-[1.5] text-ink">{parcel.reasoning}</p>
          <p className="text-[12px] leading-[1.5] text-muted">
            A full feasibility report has not been written for this sample site
            yet. Only 1840 W Olive Commons has one in this prototype.
          </p>
          <ButtonLink href="/results/olive-commons" className="self-start">
            Open the Olive Commons sample report
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-7 px-6 pt-8 pb-10 lg:px-20">
      {crumbs}

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <StatusTag size="md" shape="soft" tone="line">
            {feasibilityLabel[parcel.feasibility]}
          </StatusTag>
          {parcel.onMarket ? (
            <StatusTag size="md" shape="soft" tone="line-accent">
              On the market
            </StatusTag>
          ) : null}
          <StatusTag size="md" shape="soft" tone="line-muted">
            Fictional sample site
          </StatusTag>
        </div>
        <h1 className="font-display text-[42px] leading-[1.2] font-bold text-ink">
          {parcel.address}
        </h1>
        <p className="text-[13px] leading-[1.5] text-muted">
          {parcel.city}, CA · {report.ownerName} · {parcel.owner}
        </p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <section className="flex flex-1 flex-col gap-[22px] rounded-[16px] border border-line bg-surface p-7">
          <Eyebrow>A pathway worth investigating</Eyebrow>
          <p className="font-display text-[23px] leading-[1.2] font-semibold text-ink">
            {report.headline}
          </p>
          <p className="text-[13px] leading-[1.5] text-muted">{report.summary}</p>
          <dl className="grid grid-cols-2 gap-6 leading-[1.5] sm:grid-cols-4">
            {report.facts.map((fact) => (
              <div key={fact.label} className="flex flex-col gap-1">
                <dt className="text-[10px] text-muted">{fact.label}</dt>
                <dd className="text-[14px] font-semibold text-ink">{fact.value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-[10px] leading-[1.5] text-muted">{report.factsNote}</p>
        </section>
        <ParcelContextMap acresLabel={`${parcel.acres.toFixed(2)} ac`} />
      </div>

      <section className="flex gap-[14px] rounded-[16px] border border-line bg-canvas p-[22px]">
        <FigmaIcon src="/figma/parcel/triangleAlert.svg" size={22} />
        <div className="flex flex-1 flex-col gap-[7px]">
          <p className="font-display text-[22px] leading-[1.2] font-semibold text-ink">
            {report.caveat.title}
          </p>
          <p className="text-[12px] leading-[1.5] text-ink">{report.caveat.body}</p>
          <p className="text-[10px] leading-[1.5] text-muted">{report.caveat.confidence}</p>
        </div>
      </section>

      <section className="flex flex-col gap-[18px] rounded-[16px] border border-line bg-surface p-7">
        <SectionHeading
          number="01"
          title="State law eligibility"
          description="Conditional screening, not an approval. Each law has additional requirements and exclusions."
        />
        <div className="flex flex-col">
          {report.stateLaw.map((finding) => (
            <div
              key={finding.title}
              className="flex flex-col gap-3 border-t border-line py-[18px] sm:flex-row sm:gap-7"
            >
              <div className="flex flex-col gap-[3px] leading-[1.5] sm:w-[168px] sm:shrink-0">
                <p className="text-[13px] text-ink">{finding.title}</p>
                <p className="text-[10px] text-muted">{finding.subtitle}</p>
              </div>
              <div className="flex flex-1 flex-col items-start gap-2">
                <StatusTag tone={finding.tone} solid shape="soft">
                  {finding.status}
                </StatusTag>
                <FindingNotes finding={finding} />
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] leading-[1.5] text-muted">
          Source links are official HCD fact sheets, bill pages or code sections,
          checked 2026-11-06. A summary is not the rule: read the source.
        </p>
      </section>

      <section className="flex flex-col gap-[18px] rounded-[16px] border border-line bg-surface p-7">
        <SectionHeading
          number="02"
          title="Local zoning"
          description="What the sample city code means in everyday language."
        />
        <div className="flex flex-col">
          {report.zoning.map((finding) => (
            <DiligenceCheck key={finding.title} finding={finding} />
          ))}
        </div>
        <p className="text-[10px] leading-[1.5] text-muted">{report.zoningSource}</p>
      </section>

      <section className="flex flex-col gap-[18px] rounded-[16px] border border-line bg-surface p-7">
        <SectionHeading
          number="03"
          title="Title & CC&R check"
          description="Private restrictions are a separate question from zoning. This is not a title opinion."
        />
        <div className="flex flex-col">
          {report.title.map((finding) => (
            <DiligenceCheck key={finding.title} finding={finding} />
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-[18px]">
        <div className="flex flex-col gap-[6px]">
          <p className="font-display text-[16px] leading-[1.2] font-semibold text-ink">
            {report.nextStep.title}
          </p>
          <p className="text-[12px] leading-[1.5] text-muted">{report.nextStep.body}</p>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <ReportActions memoHref={`/results/${parcel.id}/memo`} />
          <p className="flex-1 text-[10px] leading-[1.5] text-muted lg:text-right">
            Prepared for {workspace.organization} · Sample only
          </p>
        </div>
      </div>
    </div>
  );
}
