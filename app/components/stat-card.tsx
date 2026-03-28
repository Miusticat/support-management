import { LucideIcon } from "lucide-react";
import { UICard } from "@/app/components/ui-card";

type StatCardProps = {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
};

export function StatCard({ title, value, description, icon: Icon, gradient }: StatCardProps) {
  return (
    <UICard className={`group overflow-hidden bg-gradient-to-br ${gradient} p-[1px]`}>
      <div className="rounded-[15px] bg-[#0d0d0d]/90 p-6 transition-transform duration-200 group-hover:scale-[1.01]">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">{title}</p>
          <div className="grid h-9 w-9 place-items-center rounded-lg border border-white/15 bg-white/[0.06] text-[var(--color-neutral-white)]">
            <Icon className="h-4 w-4" />
          </div>
        </div>

        <p className="text-3xl font-bold tracking-tight text-[var(--color-neutral-white)]">{value}</p>
        <p className="mt-2 text-sm text-[var(--color-neutral-grey)]">{description}</p>
      </div>
    </UICard>
  );
}
