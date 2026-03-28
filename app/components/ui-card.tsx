import { ReactNode } from "react";

type UICardProps = {
  children: ReactNode;
  className?: string;
};

export function UICard({ children, className = "" }: UICardProps) {
  return (
    <section
      className={`rounded-2xl border border-white/10 bg-[#141414] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#ffac00]/30 hover:bg-[#1a1a1a] ${className}`}
    >
      {children}
    </section>
  );
}
