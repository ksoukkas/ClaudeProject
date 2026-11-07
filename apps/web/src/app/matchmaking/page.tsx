import type { Metadata } from "next";
import { DirectoryProfile } from "@/components/directory-profile";
import { Button, Eyebrow, FigmaIcon } from "@/components/ui";
import { developers, landowners } from "@/lib/sample-data";

export const metadata: Metadata = { title: "Matchmaking" };

function SideHeading({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-[16px] bg-canvas p-[22px]">
      <div className="flex items-center gap-[10px]">
        <FigmaIcon src={icon} size={20} />
        <h2 className="font-display text-[25px] leading-[1.2] font-semibold text-ink">
          {title}
        </h2>
      </div>
      <p className="text-[12px] leading-[1.5] text-ink-soft">{description}</p>
    </div>
  );
}

export default function MatchmakingPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-7 px-6 py-11 lg:px-16">
      <div className="flex flex-col gap-3">
        <Eyebrow>Land meets mission</Eyebrow>
        <h1 className="font-display text-[42px] leading-[1.2] font-bold text-ink">
          Good housing starts with a conversation.
        </h1>
        <p className="max-w-[900px] text-[15px] leading-[1.5] text-ink-soft">
          A meeting place for landowners with room to share and nonprofit
          developers ready to build. Find a shared goal before you talk about a
          deal.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button icon="/figma/match/mapPin.svg" disabled title="Sample filter">
          Orange County
        </Button>
        <Button icon="/figma/match/chevronDown.svg" disabled title="Sample filter">
          All housing goals
        </Button>
        <Button icon="/figma/match/chevronDown.svg" disabled title="Sample filter">
          All land sizes
        </Button>
        <p className="flex-1 text-[11px] leading-[1.5] text-ink-soft">
          {landowners.length} landowners · {developers.length} nonprofit
          developers · All sample profiles
        </p>
        <Button
          variant="primary"
          icon="/figma/match/plus.svg"
          disabled
          title="Prototype: sign-up is not wired up yet"
        >
          Add your organization
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-7 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <SideHeading
            icon="/figma/match/sprout1.svg"
            title="We have land."
            description="Congregations and other owners open to housing."
          />
          {landowners.map((p) => (
            <DirectoryProfile key={p.name} profile={p} />
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <SideHeading
            icon="/figma/match/housePlus.svg"
            title="We build housing."
            description="Mission-driven teams seeking their next site."
          />
          {developers.map((p) => (
            <DirectoryProfile key={p.name} profile={p} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-[18px] rounded-[16px] bg-[#1d1d1f] p-6 sm:flex-row sm:items-center">
        <FigmaIcon src="/figma/match/handshake.svg" size={28} />
        <div className="flex flex-1 flex-col gap-[5px]">
          <p className="font-display text-[22px] leading-[1.2] font-semibold text-white">
            An introduction, not an obligation.
          </p>
          <p className="text-[12px] leading-[1.5] text-[#d1d1d6]">
            Both sides opt in before contact details are shared. You decide
            whether the goals, timing and site are a fit.
          </p>
        </div>
        <Button size="md" icon="/figma/match/arrowRight.svg" disabled title="Coming soon">
          How introductions work
        </Button>
      </div>
    </div>
  );
}
