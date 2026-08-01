"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { AlertTriangle, Droplets, PackageOpen, PawPrint, Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { StatCard } from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/AsyncState";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { formatStockQuantity } from "@/lib/stock-format";
import { loadDashboardData, onDashboardUpdated } from "@/services/dashboard";
import { useAuth } from "@/lib/auth-context";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { withAsyncTimeout } from "@/lib/async";
import type { AnyRecord } from "@/lib/types";

type ChartDatum = { label: string; value: number };

type DashboardViewData = {
  cards: {
    totalAnimals: number;
    activeAnimals: number;
    productionToday: number;
    productionMonth: number;
    income: number;
    expenses: number;
    profit: number;
    criticalStock: number;
    activeEmployees: number;
    activeAlerts: number;
  };
  charts: {
    productionByDay: ChartDatum[];
    animalRanking: ChartDatum[];
  };
  criticalStock: AnyRecord[];
  finance: AnyRecord[];
  productions: AnyRecord[];
};

const emptyDashboard: DashboardViewData = {
  cards: {
    totalAnimals: 0,
    activeAnimals: 0,
    productionToday: 0,
    productionMonth: 0,
    income: 0,
    expenses: 0,
    profit: 0,
    criticalStock: 0,
    activeEmployees: 0,
    activeAlerts: 0
  },
  charts: { productionByDay: [], animalRanking: [] },
  criticalStock: [],
  finance: [],
  productions: []
};

function ChartSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={`chart-skeleton-${index}`} className="grid grid-cols-[5rem_1fr_3rem] items-center gap-3">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3 w-full rounded-full" />
          <Skeleton className="h-3.5 w-12 justify-self-end" />
        </div>
      ))}
    </div>
  );
}

const BarChart = dynamic(
  () => import("@/components/ui/BarChart").then((module) => module.BarChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

export default function DashboardPage() {
  const { dataContext, profile } = useAuth();
  const farmId = dataContext.fazendaId;
  const userId = dataContext.usuarioId;
  const [data, setData] = useState(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const loadRequestRef = useRef(0);

  const load = useCallback(async (options: { forceRefresh?: boolean } = {}) => {
    const requestId = ++loadRequestRef.current;
    setLoading(true);
    setError("");
    try {
      const dashboard = await withAsyncTimeout(
        loadDashboardData({ fazendaId: farmId, usuarioId: userId }, options),
        "O painel demorou para carregar. Tente novamente."
      );
      if (loadRequestRef.current !== requestId) return;
      setData(dashboard);
    } catch (err) {
      if (loadRequestRef.current === requestId) {
        setError(getFriendlyErrorMessage(err, "Nao foi possivel carregar o painel agora."));
      }
    } finally {
      if (loadRequestRef.current === requestId) setLoading(false);
    }
  }, [farmId, userId]);

  useEffect(() => {
    void load();
    return () => {
      loadRequestRef.current += 1;
    };
  }, [load]);
  useEffect(() => onDashboardUpdated(() => { void load({ forceRefresh: true }); }), [load]);

  const hasLoaded = data !== emptyDashboard;
  const initialLoading = loading && !hasLoaded;
  const initialError = Boolean(error && !hasLoaded);
  const showPlaceholders = initialLoading;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{profile?.fazenda?.nome || "Dashboard"}</h1>
          <p className="mt-0.5 text-[13px] text-[var(--text-2)]">Visão geral da fazenda em tempo real</p>
        </div>
        <button onClick={() => load({ forceRefresh: true })} className="btn btn-secondary text-[13px]" type="button" disabled={loading}>
          {loading ? "Atualizando..." : "Atualizar painel"}
        </button>
      </div>

      {/* Summary strip */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
          {showPlaceholders ? (
            <>
              <div><Skeleton className="h-3 w-20 mb-1.5" /><Skeleton className="h-6 w-28" /></div>
              <div className="hidden sm:block h-8 w-px bg-[var(--border)]" />
              <div><Skeleton className="h-3 w-16 mb-1.5" /><Skeleton className="h-6 w-24" /></div>
              <div className="hidden sm:block h-8 w-px bg-[var(--border)]" />
              <div><Skeleton className="h-3 w-14 mb-1.5" /><Skeleton className="h-6 w-24" /></div>
              <div className="hidden sm:block h-8 w-px bg-[var(--border)]" />
              <div><Skeleton className="h-3 w-20 mb-1.5" /><Skeleton className="h-6 w-16" /></div>
            </>
          ) : initialError ? (
            <p className="text-sm text-[var(--text-3)]">Não foi possível carregar os dados do painel.</p>
          ) : (
            <>
              <Link href="/financeiro" className="min-w-0 rounded-md px-1 py-0.5 transition-colors hover:bg-[var(--bg)]">
                <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--text-3)]">Resultado do mês</p>
                <p className={`mt-0.5 text-lg font-semibold tabular-nums tracking-tight ${data.cards.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{formatCurrency(data.cards.profit)}</p>
              </Link>
              <div className="hidden h-8 w-px bg-[var(--border)] sm:block" />
              <Link href="/financeiro" className="min-w-0 rounded-md px-1 py-0.5 transition-colors hover:bg-[var(--bg)]">
                <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--text-3)]">Entradas</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight">{formatCurrency(data.cards.income)}</p>
              </Link>
              <div className="hidden h-8 w-px bg-[var(--border)] sm:block" />
              <Link href="/financeiro" className="min-w-0 rounded-md px-1 py-0.5 transition-colors hover:bg-[var(--bg)]">
                <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--text-3)]">Saídas</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight">{formatCurrency(data.cards.expenses)}</p>
              </Link>
              <div className="hidden h-8 w-px bg-[var(--border)] sm:block" />
              <Link href="/producao" className="min-w-0 rounded-md px-1 py-0.5 transition-colors hover:bg-[var(--bg)]">
                <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--text-3)]">Produção hoje</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight">{formatNumber(data.cards.productionToday, " L")}</p>
              </Link>
              <div className="hidden h-8 w-px bg-[var(--border)] sm:block" />
              <Link href="/producao" className="min-w-0 rounded-md px-1 py-0.5 transition-colors hover:bg-[var(--bg)]">
                <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--text-3)]">Produção mês</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight">{formatNumber(data.cards.productionMonth, " L")}</p>
              </Link>
            </>
          )}
        </div>
      </div>

      {error && hasLoaded ? (
        <ErrorState
          title="Nao consegui atualizar o painel agora."
          message="Os ultimos dados carregados continuam visiveis."
          onRetry={() => load({ forceRefresh: true })}
        />
      ) : null}
      {initialError ? (
        <ErrorState
          title="Nao consegui carregar o painel."
          message={error}
          onRetry={() => load({ forceRefresh: true })}
        />
      ) : null}

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Animais ativos" value={initialError ? "-" : data.cards.activeAnimals} icon={PawPrint} tone="green" loading={showPlaceholders} href="/rebanho" />
        <StatCard title="Produção diária" value={initialError ? "-" : formatNumber(data.cards.productionToday, " L")} icon={Droplets} tone="blue" loading={showPlaceholders} href="/producao" />
        <StatCard title="Estoque crítico" value={initialError ? "-" : data.cards.criticalStock} hint={data.cards.criticalStock > 0 ? "itens abaixo do mínimo" : undefined} icon={PackageOpen} tone={data.cards.criticalStock > 0 ? "red" : "green"} loading={showPlaceholders} href="/estoque" />
        <StatCard title="Funcionários" value={initialError ? "-" : data.cards.activeEmployees} icon={Users} tone="slate" loading={showPlaceholders} href="/funcionarios" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 border-b border-[var(--border-light)] px-4 py-3">
            <h2 className="text-sm font-semibold">Produção por dia</h2>
          </div>
          {showPlaceholders ? <ChartSkeleton /> : initialError ? <p className="p-6 text-center text-sm text-[var(--text-3)]">Não foi possível carregar este gráfico agora.</p> : (
            <div className="p-4">
              <BarChart data={data.charts.productionByDay} suffix=" L" />
            </div>
          )}
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 border-b border-[var(--border-light)] px-4 py-3">
            <h2 className="text-sm font-semibold">Top produção por animal</h2>
          </div>
          {showPlaceholders ? <ChartSkeleton /> : initialError ? <p className="p-6 text-center text-sm text-[var(--text-3)]">Não foi possível carregar este gráfico agora.</p> : (
            <div className="p-4">
              <BarChart data={data.charts.animalRanking} suffix=" L" />
            </div>
          )}
        </div>
      </div>

      {/* Stock alerts */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 border-b border-[var(--border-light)] px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-semibold">Alertas de estoque</h2>
        </div>
        <div className="divide-y divide-[var(--border-light)]">
          {showPlaceholders ? Array.from({ length: 3 }).map((_, index) => (
            <div key={`stock-alert-skeleton-${index}`} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="ml-auto h-4 w-40" />
            </div>
          )) : initialError ? (
            <p className="px-4 py-4 text-sm text-[var(--text-3)]">Não foi possível carregar os alertas de estoque agora.</p>
          ) : data.criticalStock.length ? data.criticalStock.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${Number(item.quantidade_atual || 0) <= Number(item.quantidade_minima || 0) * 0.5 ? "bg-red-500" : "bg-amber-500"}`} />
              <span className="text-[13px] font-medium">{item.nome}</span>
              <span className="ml-auto text-xs text-[var(--text-2)] tabular-nums">
                {formatStockQuantity(item.quantidade_atual, item.unidade_medida)} / mín. {formatStockQuantity(item.quantidade_minima, item.unidade_medida)}
              </span>
            </div>
          )) : <p className="px-4 py-4 text-sm text-[var(--text-3)]">Nenhum item crítico no momento.</p>}
        </div>
      </div>
    </div>
  );
}
