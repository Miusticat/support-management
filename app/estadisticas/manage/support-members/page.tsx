"use client";

import SupportMembersManager from "@/app/components/stats-manage/SupportMembersManager";

export default function SupportMembersPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Miembros de soporte</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Gestiona los miembros del equipo de soporte para filtrar estadísticas
        </p>
      </div>

      <SupportMembersManager />
    </div>
  );
}
