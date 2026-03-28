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
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--color-neutral-white)]">{title}</h3>
          <p className="mt-1 text-[13px] text-[var(--color-neutral-grey)]">{subtitle}</p>
        </div>
        {badge ? (
          <span className="rounded-lg border border-[#ffac00]/25 bg-[#ffac00]/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-[#ffac00]">
            {badge}
          </span>
        ) : null}
      </div>
      {children}
    </UICard>
  );
}
