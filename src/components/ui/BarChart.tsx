import { memo, useMemo } from "react";
import { formatNumber } from "@/lib/utils";

export const BarChart = memo(function BarChart({ data, suffix = "" }: { data: Array<{ label: string; value: number }>; suffix?: string }) {
  const max = useMemo(() => Math.max(...data.map((item) => Math.abs(item.value)), 1), [data]);

  if (!data.length) {
    return <div className="rounded-lg border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--text-3)]">Sem dados para exibir.</div>;
  }

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label} className="grid grid-cols-[5rem_1fr_5rem] items-center gap-3 text-sm">
          <span className="truncate text-right text-xs font-medium text-[var(--text-2)]">{item.label}</span>
          <div className="h-4 overflow-hidden rounded bg-[var(--bg)]">
            <div className={`h-full rounded ${item.value < 0 ? "bg-red-400 dark:bg-red-500/70" : "bg-emerald-500/70 dark:bg-emerald-400/50"}`} style={{ width: `${Math.max(5, (Math.abs(item.value) / max) * 100)}%` }} />
          </div>
          <span className="text-right text-xs font-semibold tabular-nums">{formatNumber(item.value, suffix)}</span>
        </div>
      ))}
    </div>
  );
});
