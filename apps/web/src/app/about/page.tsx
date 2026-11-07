import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { Placeholder } from "@/components/placeholder";
import { CONFIDENCE_COPY } from "@/lib/confidence";
import {
  BORDERLINE_PCT,
  LOW_COVERAGE,
  MAX_AGE,
  MEDIUM_COVERAGE,
  SLIVER_PCT,
} from "@/lib/thresholds";

export const metadata: Metadata = { title: "About" };

const percent = (share: number) => `${Math.round(share * 100)}%`;

const ageLabels = [
  ["Surplus notices", MAX_AGE.surplus_notice],
  ["Parcels and footprints", MAX_AGE.parcels],
  ["Zoning and land use", MAX_AGE.zoning],
  ["Flood and fire maps", MAX_AGE.hazard_map],
  ["Confirmation from a person", MAX_AGE.human_confirmation],
  ["Our law rules", MAX_AGE.law_rules],
] as const;

const ageText = (age: (typeof ageLabels)[number][1]) => {
  if (age === null) return "No limit";
  return "days" in age ? `${age.days} days` : `${age.months} months`;
};

const parts = [
  ["Confidence rule and tests", "Working"],
  ["Law source links", "Real, checked 2026-11-06"],
  ["Sites, owners and documents", "Fictional sample"],
  ["Site order", "Typed sample order, not ranked by the tests"],
  ["Map", "Illustrative, not to scale"],
  ["Live parcel data", "Not connected yet"],
  ["Contact, alert and intro buttons", "Mock-ups: nothing is sent"],
];

export default function AboutPage() {
  return (
    <PageShell
      title="About"
      description="What this prototype does, where its data comes from, and what is assumed."
    >
      <section id="confidence" className="flex scroll-mt-6 flex-col gap-3">
        <h2 className="text-lg font-medium">How confidence works</h2>
        <p className="text-sm">
          {CONFIDENCE_COPY.meaning} It is worked out from the tests on each site, not typed in. A
          test with no data is Unknown, never Pass.
        </p>
        <ul className="flex list-inside list-disc flex-col gap-1 text-sm">
          <li>
            If a test fails, confidence is about that failure. Open tests do not lower it, so a
            site can be a Red flag with High confidence.
          </li>
          <li>For SB 9, if the zoning or lot-size test is open, the result is Not enough data.</li>
          <li>
            Otherwise: nothing unknown is High. At least {percent(MEDIUM_COVERAGE)} of public tests
            answered is Medium. At least {percent(LOW_COVERAGE)} is Low. Less is Not enough data.
          </li>
          <li>
            Tests only a person can answer do not count toward that share, but while one is open
            a site cannot reach High.
          </li>
          <li>
            Fictional sample data caps confidence at Low. A secondary source, or a law flagged for
            verification, caps it at Medium. A stale or undated source drops it one step.
          </li>
          <li>
            A value within {BORDERLINE_PCT}% of a limit, or an overlap up to {SLIVER_PCT}% of the
            parcel, is too close to call and stays Unknown.
          </li>
        </ul>
        <p className="text-sm font-medium">
          ASSUMPTION: every cut-off here is a working choice for this prototype. No statute gives
          these numbers.
        </p>
        <h3 className="text-sm font-medium">ASSUMPTION: how old a source can be</h3>
        <ul className="flex list-inside list-disc flex-col gap-1 text-sm">
          {ageLabels.map(([label, age]) => (
            <li key={label}>
              {label}: {ageText(age)}
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">What is real and what is mocked</h2>
        <table className="text-left text-sm">
          <tbody>
            {parts.map(([part, state]) => (
              <tr key={part} className="border-t border-line">
                <th scope="row" className="py-2 pr-4 font-medium">
                  {part}
                </th>
                <td className="py-2">{state}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Sources</h2>
        <Placeholder label="list of laws, datasets and programs used, each with a URL and the date checked." />
      </section>
    </PageShell>
  );
}
