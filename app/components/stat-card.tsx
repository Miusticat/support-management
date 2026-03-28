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
    <UICard hoverable className={`group overflow-hidden bg-gradient-to-br ${gradient} p-[1px]`}>
      <div className="rounded-[15px] bg-[#0d0d0d]/90 p-6 backdrop-blur-sm transition-transform duration-200 group-hover:scale-[1.01]">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--color-neutral-grey)]">{title}</p>
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-[#ffac00]/15 bg-[#ffac00]/[0.07] text-[#ffac00] shadow-[0_0_16px_rgba(255,172,0,0.08)]">
            <Icon className="h-[18px] w-[18px]" />
          </div>
        </div>

        <p className="text-4xl font-bold tracking-tight text-[var(--color-neutral-white)]">{value}</p>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-neutral-grey)]">{description}</p>
      </div>
    </UICard>
  );
}
