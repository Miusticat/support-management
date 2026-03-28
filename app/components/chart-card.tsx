import { ReactNode } from "react";
import { UICard } from "@/app/components/ui-card";

type ChartCardProps = {
  title: string;
  subtitle: string;
  badge?: string;
  children: ReactNode;
  className?: string;
};

export function ChartCard({
  title,
  subtitle,
  badge,
  children,
  className = "",
}: ChartCardProps) {
  return (
    <UICard className={`p-6 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-medium text-[var(--color-neutral-white)]">{title}</h3>
          <p className="mt-1 text-sm text-[var(--color-neutral-grey)]">{subtitle}</p>
        </div>
        {badge ? (
          <span className="rounded-lg border border-[#ffac00]/35 bg-[#ffac00]/15 px-2 py-1 text-xs uppercase tracking-wide text-[#ffac00]">
            {badge}
          </span>
        ) : null}
      </div>
      {children}
    </UICard>
  );
}
