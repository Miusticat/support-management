"use client";

import { ReactNode } from "react";
import { useSession } from "next-auth/react";
import { ShieldAlert, Loader2 } from "lucide-react";
import type { PermissionKey } from "@/lib/stats/permissions";

interface Props {
  permission: PermissionKey;
  children: ReactNode;
  fallback?: ReactNode;
}

// Mirrors the shape of the tracker permission map, computed client-side
// from the Discord staff role on the session.
function computePerms(role: string | null | undefined) {
  const isLead = role === "Support Lead" || role === "Head of Team";
  const isTrainer = role === "Support Trainer";
  return {
    can_import: isLead || isTrainer,
    can_delete_range: isLead,
    can_delete_all: isLead,
    can_export: true,
    can_manage_users: isLead,
    can_view_audit: isLead,
    can_manage_categories: isLead || isTrainer,
    can_manage_support: isLead,
  } satisfies Record<PermissionKey, boolean>;
}

export function PermissionGuard({ permission, children, fallback }: Props) {
  const { data, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-text-secondary justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando...
      </div>
    );
  }

  const role = data?.user?.staffRole ?? null;
  const perms = computePerms(role);

  if (!perms[permission]) {
    return (
      fallback ?? (
        <div className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 rounded-xl border border-border bg-surface p-8 text-center">
          <ShieldAlert className="h-8 w-8 text-amber" />
          <h2 className="text-lg font-semibold">Sin permiso</h2>
          <p className="text-sm text-text-secondary">
            Tu rol actual no puede acceder a esta sección.
          </p>
        </div>
      )
    );
  }

  return <>{children}</>;
}
