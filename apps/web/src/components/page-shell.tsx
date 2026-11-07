import type { ReactNode } from "react";

type PageShellProps = {
  title: string;
  description?: string;
  children?: ReactNode;
};

/** Consistent page heading and spacing for every route. */
export function PageShell({ title, description, children }: PageShellProps) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="font-display text-[40px] leading-[1.2] font-bold">{title}</h1>
        {description ? (
          <p className="mt-1 text-ink-soft">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
