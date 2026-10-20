import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  dense = false,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  dense?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1
          className={`mt-1 font-semibold tracking-tight ${dense ? "text-xl sm:text-3xl" : "text-2xl sm:text-3xl"}`}
        >
          {title}
        </h1>
        {description && (
          <p className={`mt-2 max-w-xl text-sm text-[var(--muted)] ${dense ? "hidden sm:block" : ""}`}>
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
