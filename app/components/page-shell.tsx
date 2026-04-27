import { ReactNode } from "react";
import { Sidebar } from "@/app/components/sidebar";
import { TopNavbar } from "@/app/components/top-navbar";
import { SidebarProvider } from "@/app/components/sidebar-context";

type PageShellProps = {
  children: ReactNode;
};

export function PageShell({ children }: PageShellProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-[#0d0d0d] text-[var(--color-neutral-white)] lg:grid lg:grid-cols-[260px_1fr]">
        <Sidebar />
        <div className="flex min-h-screen flex-col">
          <TopNavbar />
          <main className="flex-1 px-4 py-6 sm:px-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
