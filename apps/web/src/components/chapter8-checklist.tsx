import { CHECKLIST, GUIDE_URL } from "@/lib/chapter8/county-list";

/** The Chapter 8 application steps, each with the code section it rests on. */
export function Chapter8Checklist() {
  return (
    <section className="flex flex-col gap-3 rounded-[16px] border border-line bg-surface p-7">
      <h2 className="font-display text-[22px] leading-[1.2] font-semibold text-ink">
        How a nonprofit applies
      </h2>
      <ol className="flex list-inside list-decimal flex-col gap-2 text-[13px] leading-[1.5] text-ink">
        {CHECKLIST.map((item) => (
          <li key={item.step}>
            {item.step} <span className="text-[11px] text-ink-soft">Rev. &amp; Tax. Code {item.cite}</span>
          </li>
        ))}
      </ol>
      <p className="text-[11px] leading-[1.5] text-ink-soft">
        From the State Controller&apos;s{" "}
        <a href={GUIDE_URL} target="_blank" rel="noreferrer" className="text-accent hover:underline">
          Guide to Preparing the Chapter 8 Agreement Sale Package ↗
        </a>{" "}
        (updated 12/2018). Rules for these sales have changed since then, so confirm the current
        steps with the County of Orange Treasurer-Tax Collector. Not legal advice.
      </p>
    </section>
  );
}
