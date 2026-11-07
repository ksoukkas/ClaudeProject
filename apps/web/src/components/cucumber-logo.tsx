/**
 * Cucumber logo, from the "Cucumber — Primary logo" frame in Figma (node 13:88).
 * The mark is a 240×240 asset with built-in padding (the circle spans 75% of
 * the box), so `markSize` is the box size, not the circle size.
 */
export function CucumberMark({ size, className = "" }: { size: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static brand SVG
    <img
      src="/brand/cucumber-mark.svg"
      alt=""
      aria-hidden
      width={size}
      height={size}
      className={`block shrink-0 ${className}`}
    />
  );
}

/**
 * Compact mark + wordmark lockup for headers. Type follows the Figma lockup
 * (DM Sans Bold, -0.04em tracking, #174738). The mark is scaled down from the
 * full lockup (where the circle is ~2.2× the type size) so it fits an 80px
 * header; the mark's built-in padding acts as the gap.
 */
export function CucumberLogo({
  wordmarkSize = 26,
  className = "",
}: {
  wordmarkSize?: number;
  className?: string;
}) {
  const markSize = Math.round(wordmarkSize * 1.7);
  return (
    <span className={`flex items-center ${className}`}>
      <CucumberMark size={markSize} />
      <span
        className="font-brand leading-none font-bold tracking-[-0.04em] text-brand-ink"
        style={{ fontSize: wordmarkSize }}
      >
        cucumber
      </span>
    </span>
  );
}
