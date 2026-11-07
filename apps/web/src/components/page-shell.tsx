import type { ReactNode } from "react";

type PageShellProps = {
  title: string;
  description?: string;
  children?: ReactNode;
};

/** Consistent page heading and spacing for every route. */
export function PageShell({ title, description, children }: PageShellProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 text-neutral-600">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
