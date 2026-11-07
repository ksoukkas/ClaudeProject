import { OcMap } from "@/components/oc-map";
import { ScoutPrompt } from "@/components/scout-prompt";
import { ButtonLink, FigmaIcon, StatusTag } from "@/components/ui";
import { parcels } from "@/lib/sample-data";

/* Sample progress for the demo scout run. Counts are fictional. */
const steps = [
  { label: "Pulling parcels", state: "done", count: "126 found" },
  { label: "Checking zoning", state: "done", count: "42 candidates" },
  { label: "Screening state laws", state: "done", count: "26 possible fits" },
  { label: "Checking title & CC&Rs", state: "active", count: "18 / 26 checked" },
  { label: "Ranking results", state: "todo", count: "0 / 26 ranked" },
] as const;

const stepStyle = {
  done: { bg: "bg-step-done", icon: "/figma/scout/check.svg", note: "Complete" },
  active: {
    bg: "bg-step-active",
    icon: "/figma/scout/loaderCircle.svg",
    note: "In progress",
  },
  todo: { bg: "bg-step-todo", icon: "/figma/scout/circleDashed.svg", note: "Up next" },
} as const;

export default function ScoutPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-[34px] px-6 pt-[52px] pb-11 lg:px-[100px]">
      <section className="flex flex-col items-center gap-4 text-center">
        <p className="text-[10px] tracking-[1.8px] text-accent">
          A LITTLE LAND. A LOT OF POSSIBILITY.
        </p>
        <h1 className="font-display text-[40px] leading-[1.14] font-bold tracking-[-1.8px] text-ink lg:text-[52px]">
          Find the land. See the possibility.
        </h1>
        <p className="max-w-[700px] text-[16px] leading-[1.5] text-muted">
          Tell us what you hope to build. Siteline connects parcel data and
          California housing laws so you know where to look — and what to
          verify.
        </p>
      </section>

      <ScoutPrompt />

      <section className="flex w-full flex-col overflow-hidden rounded-[20px] border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-7 py-5">
          <div className="flex items-center gap-[10px]">
            <FigmaIcon src="/figma/scout/sparkles1.svg" size={18} />
            <p className="text-[13px] leading-[1.5] text-ink">Your scout is working</p>
          </div>
          <StatusTag tone="accent" solid shape="pill">
            LIVE SCREEN
          </StatusTag>
        </div>

        <div className="flex flex-col gap-10 p-7 lg:flex-row lg:items-center">
          <div className="flex flex-1 flex-col gap-[14px]">
            <p className="text-[13px] leading-[1.5] text-muted">
              One search. Five layers of due diligence.
            </p>
            <ol className="flex flex-col">
              {steps.map((step) => {
                const style = stepStyle[step.state];
                return (
                  <li
                    key={step.label}
                    className="flex items-center gap-3 border-b border-line py-3"
                  >
                    <span
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full ${style.bg}`}
                    >
                      <FigmaIcon
                        src={style.icon}
                        size={13}
                        className={step.state === "active" ? "animate-spin" : ""}
                      />
                    </span>
                    <span className="flex flex-1 flex-col gap-[2px] leading-[1.5]">
                      <span
                        className={`text-[13px] text-step-ink ${
                          step.state === "active" ? "" : "font-medium"
                        }`}
                      >
                        {step.label}
                      </span>
                      <span
                        className={`text-[10px] ${
                          step.state === "active"
                            ? "text-step-active-ink"
                            : "text-step-muted"
                        }`}
                      >
                        {style.note}
                      </span>
                    </span>
                    <span className="text-[10px] leading-[1.5] whitespace-nowrap text-step-muted">
                      {step.count}
                    </span>
                  </li>
                );
              })}
            </ol>
            <p className="text-[10px] leading-[1.5] text-muted">
              We flag uncertainty instead of assuming a green light.
            </p>
          </div>

          <div className="flex w-full flex-col gap-[10px] lg:w-[440px]">
            <OcMap
              variant="scout"
              className="rounded-[16px]"
              pins={parcels.map((p) => ({ rank: p.rank, feasibility: p.feasibility }))}
            />
            <p className="text-[10px] leading-[1.5] text-muted">
              Searching Anaheim + nearby cities · 5 cities in this sample
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 bg-canvas px-7 py-4 sm:flex-row sm:items-center">
          <div className="flex flex-1 flex-col gap-[2px] leading-[1.5]">
            <p className="text-[12px] font-semibold text-ink">Possibility, not a promise.</p>
            <p className="text-[11px] text-muted">
              Every match includes its reasoning and sources.
            </p>
          </div>
          <ButtonLink
            href="/results"
            icon="/figma/scout/arrowRight1.svg"
            variant="secondary-accent"
          >
            View preliminary results
          </ButtonLink>
        </div>
      </section>

      <p className="flex items-start justify-center gap-2 text-center text-[11px] leading-[1.5] text-muted">
        <FigmaIcon src="/figma/scout/bookOpen.svg" size={14} className="mt-[2px]" />
        Built around SB 9, SB 684 / 1123, AB 2011 and SB 4. Designed for a human
        decision.
      </p>
    </div>
  );
}
