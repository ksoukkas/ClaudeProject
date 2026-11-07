import { SNAPSHOT_DATE } from "@/lib/sample-data";
import { FigmaIcon } from "@/components/ui";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-[1440px] items-start gap-2 px-6 py-4 text-[10px] leading-[1.5] text-muted lg:px-12">
        <FigmaIcon src="/figma/scout/info.svg" size={13} className="mt-px" />
        <p className="flex-1">
          Sample screens use fictional addresses, owners, listings and
          findings. Results marked &quot;Live public data&quot; come from SCAG
          and Caltrans public layers and say what is unknown. Screening only,
          not legal advice. Siteline is a prototype
          built at the Claude Impact Lab: talk to a professional before making
          decisions.
        </p>
        <p className="whitespace-nowrap">Data snapshot · {SNAPSHOT_DATE}</p>
      </div>
    </footer>
  );
}
