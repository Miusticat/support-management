import { ReactNode } from "react";

type PageHeaderProps = {
  tag: string;
  title: string;
  description?: string;
  children?: ReactNode;
};

export function PageHeader({ tag, title, description, children }: PageHeaderProps) {
  return (
    <section className="mb-8">
      <p className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[var(--color-neutral-grey)]">
        {tag}
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--color-neutral-white)] sm:text-3xl">
        {title}
      </h1>
      {description && (
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--color-neutral-grey)]">
          {description}
        </p>
      )}
      {children}
    </section>
  );
}
