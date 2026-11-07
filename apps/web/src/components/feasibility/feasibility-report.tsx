import type { ReactNode } from "react";
import { RESOLVER_LABELS } from "@/lib/feasibility/helpers";
import { getSource } from "@/lib/feasibility/sources";
import type {
  Conflict,
  Coverage,
  FeasibilityReport,
  NextStep,
  PathwayResult,
  TestResult,
  TitleCheck,
  Verdict,
} from "@/lib/feasibility/types";

const VERDICT_STYLES: Record<Verdict, string> = {
  pass: "border-green-200 bg-green-50 text-green-800",
  fail: "border-red-200 bg-red-50 text-red-800",
  unknown: "border-amber-200 bg-amber-50 text-amber-800",
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${VERDICT_STYLES[verdict]}`}
    >
      {verdict}
    </span>
  );
}

function SourceLink({ id }: { id: string }) {
  const s = getSource(id);
  const statusStyle =
    s.status === "VERIFIED" ? "bg-neutral-100 text-neutral-700" : "bg-amber-50 text-amber-800";
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
      {s.url ? (
        <a href={s.url} target="_blank" rel="noreferrer" className="underline">
          {s.name}
        </a>
      ) : (
        <span>{s.name}</span>
      )}
      <span className={`rounded px-1 ${statusStyle}`}>{s.status}</span>
      <span className="text-neutral-500">{s.checked ? `checked ${s.checked}` : "not fetched"}</span>
    </span>
  );
}

function SourceList({ ids, emptyText }: { ids: string[]; emptyText?: string }) {
  if (ids.length === 0) {
    return <span className="text-xs text-neutral-500">{emptyText ?? "No data source yet."}</span>;
  }
  return (
    <ul className="flex flex-col gap-1">
      {ids.map((id) => (
        <li key={id}>
          <SourceLink id={id} />
        </li>
      ))}
    </ul>
  );
}

function Section({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {intro ? <p className="mt-1 text-sm text-neutral-600">{intro}</p> : null}
      </div>
      {children}
    </section>
  );
}

function CoverageBox({ coverage }: { coverage: Coverage }) {
  const resolved = coverage.passed + coverage.failed;
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 text-sm">
      <p className="font-medium">
        {resolved} of {coverage.totalTests} tests resolved ({coverage.passed} pass,{" "}
        {coverage.failed} fail), {coverage.unknown} unknown.
      </p>
      <p className="mt-1 text-neutral-700">
        {coverage.resolvedFromUnverifiedSources} resolved{" "}
        {coverage.resolvedFromUnverifiedSources === 1 ? "test relies" : "tests rely"} on an
        UNVERIFIED source. {coverage.conflicts}{" "}
        {coverage.conflicts === 1 ? "disagreement" : "disagreements"} between sources.
      </p>
      <p className="mt-2 text-xs text-neutral-500">
        Confidence here is a count of resolved tests, never a probability.
      </p>
    </div>
  );
}

function TestTable({ tests }: { tests: TestResult[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
            <th className="py-2 pr-3 font-medium">Requirement</th>
            <th className="py-2 pr-3 font-medium">Data used</th>
            <th className="py-2 pr-3 font-medium">Value found</th>
            <th className="py-2 pr-3 font-medium">Verdict</th>
            <th className="py-2 font-medium">Why, and how to resolve</th>
          </tr>
        </thead>
        <tbody>
          {tests.map((t) => (
            <tr key={t.id} className="border-b border-neutral-100 align-top">
              <td className="py-2 pr-3">
                <p>{t.requirement}</p>
                <div className="mt-1">
                  <SourceList ids={t.requirementSourceIds} emptyText="No requirement source." />
                </div>
              </td>
              <td className="py-2 pr-3">
                <SourceList ids={t.dataSourceIds} />
              </td>
              <td className="py-2 pr-3 text-neutral-700">{t.valueFound}</td>
              <td className="py-2 pr-3">
                <VerdictBadge verdict={t.verdict} />
              </td>
              <td className="py-2 text-neutral-700">
                <p>{t.reason}</p>
                {t.verdict === "unknown" && t.resolver ? (
                  <p className="mt-1 text-xs text-neutral-500">
                    Resolve: {RESOLVER_LABELS[t.resolver]}
                  </p>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PathwayCard({ pathway }: { pathway: PathwayResult }) {
  const blocked = pathway.status === "blocked";
  return (
    <article className="rounded-md border border-neutral-200 p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">
            {pathway.name}{" "}
            <span className="font-normal text-neutral-500">· {pathway.statute}</span>
          </h3>
          <p className="text-sm text-neutral-600">{pathway.whatItOpens}</p>
        </div>
        <span
          className={`rounded border px-2 py-0.5 text-xs font-medium ${
            blocked
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-sky-200 bg-sky-50 text-sky-800"
          }`}
        >
          {blocked ? "Blocked by a failing test" : "No failing tests (unknowns remain)"}
        </span>
      </header>
      <div className="mt-3">
        <TestTable tests={pathway.tests} />
      </div>
      {pathway.notes.length ? (
        <ul className="mt-3 list-disc pl-5 text-xs text-neutral-600">
          {pathway.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}
      <div className="mt-3">
        <p className="text-xs font-medium text-neutral-500">Statute and summaries</p>
        <SourceList ids={pathway.sourceIds} />
      </div>
    </article>
  );
}

function ConflictList({ conflicts }: { conflicts: Conflict[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {conflicts.map((c) => (
        <li key={c.topic} className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
          <p className="font-medium">{c.topic}</p>
          <ul className="mt-1 list-disc pl-5">
            {c.observations.map((o, i) => (
              <li key={`${o.sourceId}-${i}`}>
                {o.value} — <SourceLink id={o.sourceId} />
              </li>
            ))}
          </ul>
          <p className="mt-1 text-neutral-700">{c.note}</p>
        </li>
      ))}
    </ul>
  );
}

function NextSteps({ steps }: { steps: NextStep[] }) {
  if (steps.length === 0) {
    return <p className="text-sm text-neutral-600">No unknowns left to resolve.</p>;
  }
  return (
    <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
      {steps.map((s) => (
        <li key={s.resolver}>
          <span className="font-medium">{s.label}</span>: clears {s.unknownsResolved}{" "}
          {s.unknownsResolved === 1 ? "unknown" : "unknowns"}{" "}
          <span className="text-xs text-neutral-500">({s.testIds.join(", ")})</span>
        </li>
      ))}
    </ol>
  );
}

function TitleSection({ title }: { title: TitleCheck }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <VerdictBadge verdict={title.verdict} />
        <span className="text-sm text-neutral-700">
          Title is never resolved from public data. This section is a checklist.
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {title.flags.map((f) => (
          <li key={f.label} className="rounded-md border border-neutral-200 p-3 text-sm">
            <p className="font-medium">
              {f.label}
              {f.assumption ? (
                <span className="ml-2 rounded bg-amber-50 px-1 text-xs text-amber-800">
                  ASSUMPTION
                </span>
              ) : null}
            </p>
            <p className="mt-1 text-neutral-700">{f.reason}</p>
            {f.sourceIds.length ? (
              <div className="mt-1">
                <SourceList ids={f.sourceIds} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      <ul className="list-disc pl-5 text-sm text-neutral-700">
        {title.notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
      <div>
        <p className="text-sm font-medium">Draft request to a title company</p>
        <p className="text-xs text-neutral-500">
          Copy, review and send it yourself. Siteline does not send messages.
        </p>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs">
          {title.draftRequest}
        </pre>
      </div>
    </div>
  );
}

export function FeasibilityReportView({ report }: { report: FeasibilityReport }) {
  const { parcel } = report;
  const lot =
    parcel.lotSqft !== null ? `${parcel.lotSqft.toLocaleString("en-US")} sq ft` : "lot size unknown";

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        {parcel.synthetic ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <span className="font-semibold">Synthetic parcel.</span> Every value on this page is
            made up for testing (ASSUMPTION). It does not describe a real property.
          </div>
        ) : null}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{parcel.label}</h1>
          <p className="mt-1 text-neutral-600">
            {parcel.city} · {parcel.apn ? `APN ${parcel.apn}` : "APN unknown"} · {lot}
            {parcel.existingUse ? ` · ${parcel.existingUse.value}` : ""}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Generated {report.generatedAt}. A prototype, not legal advice.
          </p>
        </div>
        <CoverageBox coverage={report.coverage} />
      </header>

      {report.conflicts.length ? (
        <Section
          title="Sources disagree"
          intro="Shown as found. Nothing here is resolved silently."
        >
          <ConflictList conflicts={report.conflicts} />
        </Section>
      ) : null}

      <Section
        title="Law delta"
        intro="What local zoning reads as, and which state pathways have no failing test."
      >
        <div className="rounded-md border border-neutral-200 p-4 text-sm">
          <p>
            <span className="font-medium">Zoning reads as:</span>{" "}
            {report.delta.zoningCategories.length
              ? report.delta.zoningCategories.join(", ")
              : "unknown"}
          </p>
          <p className="mt-1 text-neutral-700">{report.delta.baseZoningNote}</p>
          <div className="mt-3 flex flex-wrap gap-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                No failing tests
              </p>
              <p>{report.delta.open.length ? report.delta.open.join(", ") : "none"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Blocked
              </p>
              <p>{report.delta.blocked.length ? report.delta.blocked.join(", ") : "none"}</p>
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="State law eligibility"
        intro="One table per law. Each row is one requirement, the source that states it, the data that answered it and the verdict."
      >
        <div className="flex flex-col gap-4">
          {report.pathways.map((p) => (
            <PathwayCard key={p.id} pathway={p} />
          ))}
        </div>
      </Section>

      <Section
        title="Local zoning"
        intro="The city's code decides what the site allows on its own. The original text is the rule; any translation sits beside it."
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="py-2 pr-3 font-medium">Code</th>
                <th className="py-2 pr-3 font-medium">Description</th>
                <th className="py-2 pr-3 font-medium">Our category</th>
                <th className="py-2 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {parcel.zoning.length ? (
                parcel.zoning.map((z, i) => (
                  <tr key={`${z.sourceId}-${i}`} className="border-b border-neutral-100 align-top">
                    <td className="py-2 pr-3 font-mono text-xs">{z.code ?? "—"}</td>
                    <td className="py-2 pr-3">{z.description ?? "—"}</td>
                    <td className="py-2 pr-3">{z.category}</td>
                    <td className="py-2">
                      <SourceLink id={z.sourceId} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-2 text-neutral-600">
                    No zoning observation for this parcel.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {parcel.localCode ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-md border border-neutral-200 p-3 text-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Original text
              </p>
              <p className="mt-1 font-medium">{parcel.localCode.citation}</p>
              {parcel.localCode.url ? (
                <a
                  href={parcel.localCode.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs underline"
                >
                  Open the source
                </a>
              ) : null}
              <p className="mt-2 whitespace-pre-wrap text-neutral-700">{parcel.localCode.text}</p>
            </div>
            <div className="rounded-md border border-dashed border-neutral-300 p-3 text-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Plain English
              </p>
              {parcel.localCode.plainEnglish ? (
                <p className="mt-2 whitespace-pre-wrap text-neutral-700">
                  {parcel.localCode.plainEnglish}
                </p>
              ) : (
                <p className="mt-2 text-neutral-600">
                  No translation yet. Read the original text; it is the rule.
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-600">
            No local code section has been attached to this parcel. The zoning code and its
            section are unknown until someone reads the city&apos;s ordinance.
          </p>
        )}
      </Section>

      <Section
        title="Title and CC&R check"
        intro="A parcel can pass every state test and still be dead on title."
      >
        <TitleSection title={report.title} />
      </Section>

      <Section
        title="What would change this answer"
        intro="Unknowns grouped by who can resolve them, most unknowns first (ranking is an ASSUMPTION: by count, not cost)."
      >
        <NextSteps steps={report.nextSteps} />
      </Section>

      <Section title="Assumptions">
        <ul className="list-disc pl-5 text-sm text-neutral-700">
          {report.assumptions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </Section>

      <Section title="Sources used on this page">
        <SourceList ids={report.sourcesUsed.map((s) => s.id)} />
      </Section>
    </div>
  );
}
