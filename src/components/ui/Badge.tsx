import { cn } from "@/lib/utils";

export function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "success" | "warning" | "danger" | "info" }) {
  const tones = {
    default: "bg-[var(--bg)] text-[var(--text-2)]",
    success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    warning: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    danger: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300",
    info: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
  };

  return <span className={cn("inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold leading-relaxed", tones[tone])}>{children}</span>;
}
