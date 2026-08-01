import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";

const indicatorColors = {
  green: "bg-emerald-500",
  lime: "bg-lime-500",
  blue: "bg-blue-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  slate: "bg-[var(--text-3)]"
};

export function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  tone = "green",
  loading = false,
  href
}: {
  title: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "green" | "lime" | "blue" | "amber" | "red" | "slate";
  loading?: boolean;
  href?: string;
}) {
  const content = (
    <>
      <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r" aria-hidden="true">
        <div className={cn("h-full w-full rounded-r", indicatorColors[tone])} />
      </div>
      <p className="text-xs font-medium text-[var(--text-2)]">{title}</p>
      {loading ? (
        <>
          <Skeleton className="mt-2 h-7 w-3/4 max-w-48" />
          {hint ? <Skeleton className="mt-2 h-4 w-32" /> : null}
        </>
      ) : (
        <>
          <p className="mt-1.5 max-w-full truncate text-[clamp(1.1rem,1.5vw,1.5rem)] font-semibold leading-tight tracking-tight tabular-nums" title={String(value)}>{value}</p>
          {hint ? <p className="mt-1.5 text-xs text-[var(--text-3)]">{hint}</p> : null}
        </>
      )}
    </>
  );

  const className = cn(
    "relative rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 pl-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors",
    href && "cursor-pointer outline-none hover:border-[var(--text-3)] focus-visible:ring-2 focus-visible:ring-pasture/20"
  );

  return href ? (
    <Link href={href} className={className} aria-label={`Abrir ${title}`}>
      {content}
    </Link>
  ) : (
    <div className={className}>
      {content}
    </div>
  );
}
