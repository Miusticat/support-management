import { UICard } from "@/app/components/ui-card";

type HistoryItem = {
  game: string;
  platform: string;
  session: string;
  achievements: number;
  status: "up" | "down" | "new";
};

type HistoryTableProps = {
  data: HistoryItem[];
};

const statusClassMap: Record<HistoryItem["status"], string> = {
  up: "text-[var(--color-accent-green)] bg-[var(--color-accent-green)]/15 border-[var(--color-accent-green)]/30",
  down: "text-[var(--color-accent-red)] bg-[var(--color-accent-red)]/15 border-[var(--color-accent-red)]/30",
  new: "text-[var(--color-accent-yellow)] bg-[var(--color-accent-yellow)]/12 border-[var(--color-accent-yellow)]/35",
};

export function HistoryTable({ data }: HistoryTableProps) {
  return (
    <UICard className="p-0 overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">History</p>
          <h3 className="mt-1 text-lg font-medium text-[var(--color-neutral-white)]">Recent Sessions</h3>
        </div>
        <button
          type="button"
          className="rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-xs uppercase tracking-wide text-[rgba(240,240,238,0.78)] transition-all duration-200 hover:border-[var(--color-primary)]/50 hover:text-[var(--color-neutral-white)]"
        >
          All Activity
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-white/[0.02]">
            <tr className="text-left text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">
              <th className="px-6 py-3 font-medium">Game</th>
              <th className="px-6 py-3 font-medium">Platform</th>
              <th className="px-6 py-3 font-medium">Session</th>
              <th className="px-6 py-3 font-medium">Achievements</th>
              <th className="px-6 py-3 font-medium">Trend</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={`${row.game}-${row.platform}`} className="border-t border-white/8">
                <td className="px-6 py-4 text-[var(--color-neutral-white)]">{row.game}</td>
                <td className="px-6 py-4 text-[rgba(240,240,238,0.78)]">{row.platform}</td>
                <td className="px-6 py-4 text-[rgba(240,240,238,0.78)]">{row.session}</td>
                <td className="px-6 py-4 text-[var(--color-accent-sky)]">+{row.achievements}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex rounded-md border px-2 py-1 text-xs uppercase tracking-wide ${statusClassMap[row.status]}`}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </UICard>
  );
}
