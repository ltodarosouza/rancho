"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PawPrint } from "lucide-react";
import { navGroups } from "@/components/layout/navigation";
import { useAuth } from "@/lib/auth-context";
import { canAccessPlatformAdmin } from "@/lib/platform-admin";
import { canViewPath } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const isPlatformAdmin = canAccessPlatformAdmin(profile);
  const visibleGroups = navGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => (!item.platformOnly || isPlatformAdmin) && canViewPath(profile, item.href)) }))
    .filter((group) => group.items.length);

  return (
    <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-56 flex-col overflow-y-auto border-r border-[#1e2620] bg-[#141C17] lg:flex"
      style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}
    >
      <Link href="/dashboard" className="flex items-center gap-2.5 border-b border-white/[0.06] px-4 pb-4 pt-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pasture">
          <PawPrint className="h-[18px] w-[18px] text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold leading-none tracking-tight text-[#E8EDE9]">Rancho</p>
          <p className="mt-1 text-[11px] text-[#A3B0A7]">Gestão agropecuária</p>
        </div>
      </Link>

      <nav className="flex-1 px-2 py-2">
        {visibleGroups.map((group) => (
          <section key={group.label} className="mb-4">
            <p className="px-2 pb-1.5 pt-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#A3B0A7]/50">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-2 rounded-[5px] px-2 py-[7px] text-[13px] font-medium text-[#A3B0A7] transition-colors hover:bg-white/[0.06] hover:text-[#D0D7D2]",
                      active && "bg-pasture/[0.15] font-medium text-emerald-300"
                    )}
                  >
                    {active ? (
                      <span className="absolute -left-2 bottom-1.5 top-1.5 w-[3px] rounded-r bg-pasture" aria-hidden="true" />
                    ) : null}
                    <Icon className={cn("h-4 w-4 shrink-0 opacity-70", active && "opacity-100")} />
                    <span className="min-w-0 truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      <div className="border-t border-white/[0.06] px-3 py-3">
        <div className="flex items-center gap-2 px-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-pasture/30 text-[11px] font-semibold text-emerald-300">
            {(profile?.nome || "U").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-medium text-[#D0D7D2]">{profile?.nome || "Usuário"}</p>
            <p className="truncate text-[11px] text-[#A3B0A7]">{profile?.fazenda?.nome || "Fazenda"}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
