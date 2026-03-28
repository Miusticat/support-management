import { ReactNode } from "react";
import { Sidebar } from "@/app/components/sidebar";
import { TopNavbar } from "@/app/components/top-navbar";

type PageShellProps = {
  children: ReactNode;
};

export function PageShell({ children }: PageShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0d0d0d] text-[var(--color-neutral-white)]">
      {/* Ambient background glow */}
      <div className="ambient-glow" />

      <Sidebar />
      <TopNavbar />

      <main className="animate-fade-in-up relative z-10 px-4 pb-24 pt-24 sm:px-8 lg:pl-[19.5rem] lg:pr-8">
        {children}
      </main>
    </div>
  );
}
