import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { Feasibility } from "@/lib/sample-data";

/**
 * A static SVG exported from the Figma file (public/figma/<screen>/<name>.svg).
 * Colors are baked into each file, so pick the export that matches the slot.
 */
export function FigmaIcon({
  src,
  size,
  className = "",
}: {
  src: string;
  size: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny static SVGs
    <img
      src={src}
      alt=""
      aria-hidden
      width={size}
      height={size}
      // Inline size beats Tailwind's preflight `height: auto`, which would let
      // flex rows stretch the icon.
      style={{ width: size, height: size }}
      className={`block shrink-0 ${className}`}
    />
  );
}

export type Tone =
  | Feasibility
  | "neutral"
  | "accent"
  | "line"
  | "line-accent"
  | "line-muted";

const softTone: Record<Tone, string> = {
  feasible: "bg-feasible-soft text-feasible",
  review: "bg-review-soft text-review",
  blocked: "bg-blocked-soft text-blocked",
  neutral: "bg-canvas text-ink-soft",
  accent: "bg-accent-soft text-accent",
  line: "bg-line text-ink",
  "line-accent": "bg-line text-accent",
  "line-muted": "bg-line text-muted",
};

const solidTone: Record<Tone, string> = {
  ...softTone,
  feasible: "bg-feasible text-white",
  review: "bg-review text-white",
  blocked: "bg-blocked text-white",
  accent: "bg-accent text-white",
};

const tagShape = {
  tag: "rounded-[6px]",
  soft: "rounded-[10px]",
  pill: "rounded-full",
} as const;

export const feasibilityLabel: Record<Feasibility, string> = {
  feasible: "Likely feasible",
  review: "Needs review",
  blocked: "Blocked",
};

/** Small rounded label used for statuses, pathways and counts. */
export function StatusTag({
  tone = "neutral",
  solid = false,
  size = "sm",
  shape = "tag",
  children,
}: {
  tone?: Tone;
  solid?: boolean;
  size?: "sm" | "md";
  shape?: keyof typeof tagShape;
  children: ReactNode;
}) {
  const sizing =
    size === "md" ? "px-[9px] py-[5px] text-[11px]" : "px-[9px] py-[3px] text-[10px]";
  return (
    <span
      className={`inline-flex shrink-0 items-start whitespace-nowrap font-semibold leading-[1.3] ${tagShape[shape]} ${sizing} ${
        solid ? solidTone[tone] : softTone[tone]
      }`}
    >
      {children}
    </span>
  );
}

/** Uppercase blue label above a heading. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] leading-[1.4] tracking-[1.6px] text-accent uppercase">
      {children}
    </p>
  );
}

type ButtonVariant = "primary" | "secondary" | "secondary-accent";
type ButtonSize = "sm" | "md";

/** `extra` is for layout only (width, self-alignment); styling comes from props. */
function buttonClasses(variant: ButtonVariant, size: ButtonSize, extra = "") {
  const base =
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap border font-semibold transition-colors disabled:cursor-not-allowed";
  const sizing =
    size === "md"
      ? "h-11 rounded-[12px] px-[18px] text-[13px]"
      : "h-9 rounded-[10px] px-3 text-[12px]";
  const look = {
    primary: "border-accent bg-accent text-white hover:bg-accent-hover",
    secondary: "border-line bg-surface text-ink hover:bg-canvas",
    "secondary-accent": "border-line bg-surface text-accent hover:bg-canvas",
  }[variant];
  return `${base} ${sizing} ${look} ${extra}`;
}

type CommonButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  className?: string;
  children: ReactNode;
};

export function Button({
  variant = "secondary",
  size = "sm",
  icon,
  className,
  children,
  ...rest
}: CommonButtonProps & Omit<ComponentProps<"button">, "children">) {
  return (
    <button
      type="button"
      className={buttonClasses(variant, size, className)}
      {...rest}
    >
      {icon ? <FigmaIcon src={icon} size={16} /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "secondary",
  size = "sm",
  icon,
  className,
  children,
  href,
}: CommonButtonProps & { href: string }) {
  return (
    <Link href={href} className={buttonClasses(variant, size, className)}>
      {icon ? <FigmaIcon src={icon} size={16} /> : null}
      {children}
    </Link>
  );
}
