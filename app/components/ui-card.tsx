import { ReactNode } from "react";

type UICardProps = {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
};

export function UICard({ children, className = "", hoverable = false }: UICardProps) {
  return (
    <section
      className={`rounded-2xl border border-white/[0.08] bg-[#141414]/80 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.4)] backdrop-blur-sm transition-all duration-200 ${
        hoverable
          ? "hover:-translate-y-0.5 hover:border-[#ffac00]/25 hover:shadow-[0_12px_32px_rgba(0,0,0,0.5)]"
          : ""
      } ${className}`}
    >
      {children}
    </section>
  );
}
