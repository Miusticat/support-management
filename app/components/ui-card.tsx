import { ReactNode } from "react";

type UICardProps = {
  children: ReactNode;
  className?: string;
};

export function UICard({ children, className = "" }: UICardProps) {
  return (
    <section
      className={`rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_12px_30px_rgba(8,12,34,0.45)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-primary)]/35 hover:bg-white/[0.05] ${className}`}
    >
      {children}
    </section>
  );
}
