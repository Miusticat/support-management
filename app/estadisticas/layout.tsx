import type { ReactNode } from "react";
import { PageShell } from "@/app/components/page-shell";

export default function EstadisticasLayout({ children }: { children: ReactNode }) {
  return <PageShell>{children}</PageShell>;
}
