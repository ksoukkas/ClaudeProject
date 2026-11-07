type PlaceholderProps = {
  /** What will eventually go here. */
  label: string;
};

/** A visible marker for parts of the app that are not built yet. */
export function Placeholder({ label }: PlaceholderProps) {
  return (
    <div className="rounded-md border border-dashed border-line bg-canvas p-6 text-sm text-ink-soft">
      <span className="font-medium text-ink">Not built yet:</span>{" "}
      {label}
    </div>
  );
}
