type PlaceholderProps = {
  /** What will eventually go here. */
  label: string;
};

/** A visible marker for parts of the app that are not built yet. */
export function Placeholder({ label }: PlaceholderProps) {
  return (
    <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-6 text-sm text-neutral-600">
      <span className="font-medium text-neutral-800">Not built yet:</span>{" "}
      {label}
    </div>
  );
}
