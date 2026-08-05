"use client";

import {
  ChartNoAxesCombined,
  CircleDollarSign,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Send,
  Wifi,
  WifiOff
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/StatCard";
import { useAuth } from "@/lib/auth-context";
import { cn, formatCurrency } from "@/lib/utils";

type UsageBand = {
  key: string;
  label: string;
  min: number;
  max: number | null;
  additionalFee: number;
};

type RanchoUsage = {
  id: string;
  nome: string;
  plano: string;
  status: string;
  ativa: boolean;
  usage: {
    available: boolean;
    sent: number;
    total: number;
    band: UsageBand;
    nextBand: UsageBand | null;
    percentToNextBand: number | null;
  };
};

type UsageResponse = {
  ok?: boolean;
  error?: string;
  usageAvailable?: boolean;
  month?: string;
  totals?: { sent: number; total: number; surcharge: number };
  bands?: UsageBand[];
  rancho?: RanchoUsage;
};

const numberFormatter = new Intl.NumberFormat("pt-BR");
const REFRESH_INTERVAL_MS = 10_000;

function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return value;
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

function rangeLabel(band: UsageBand) {
  if (band.key === "faixa_1") return "Até 1.500 mensagens";
  if (band.key === "faixa_2") return "De 1.500 até 3.000 mensagens";
  if (band.key === "faixa_3") return "De 3.000 até 5.000 mensagens";
  if (band.key === "faixa_4") return "Acima de 5.000 mensagens";
  return band.max === null
    ? `${numberFormatter.format(band.min)}+ mensagens`
    : `${numberFormatter.format(band.min)} a ${numberFormatter.format(band.max)} mensagens`;
}

function statusLabel(status: string) {
  if (status === "ativo") return "Ativo";
  if (status === "suspenso") return "Suspenso";
  if (status === "cancelado") return "Cancelado";
  return status || "Ativo";
}

function statusTone(status: string): "success" | "danger" | "warning" {
  if (status === "ativo") return "success";
  if (status === "suspenso" || status === "cancelado") return "danger";
  return "warning";
}

function timeAgo(date: Date): string {
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return "agora";
  if (seconds < 60) return `${seconds}s atrás`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}min atrás`;
}

export default function GerenciamentoUsoPage() {
  const { profile, session } = useAuth();
  const canAccess = Boolean(profile?.ativo && profile.fazenda_id);
  const [data, setData] = useState<UsageResponse | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState("");
  const [online, setOnline] = useState(true);
  const mountedRef = useRef(true);

  const load = useCallback(async (silent = false) => {
    if (!canAccess || !session?.access_token) {
      setInitialLoading(false);
      return;
    }

    if (!silent) setInitialLoading(true);
    else setRefreshing(true);
    setError("");

    try {
      const response = await fetch(`/api/platform/uso-whatsapp?_t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store"
      });
      const result = await response.json().catch(() => ({})) as UsageResponse;
      if (!response.ok) throw new Error(result.error || "Não foi possível carregar o uso.");
      if (!mountedRef.current) return;
      setData(result);
      setLastUpdated(new Date());
      setOnline(true);
    } catch (cause) {
      if (!mountedRef.current) return;
      if (!silent) setError(cause instanceof Error ? cause.message : "Não foi possível carregar o uso.");
      setOnline(false);
    } finally {
      if (mountedRef.current) {
        setInitialLoading(false);
        setRefreshing(false);
      }
    }
  }, [canAccess, session?.access_token]);

  useEffect(() => {
    mountedRef.current = true;
    void load(false);
    return () => { mountedRef.current = false; };
  }, [load]);

  useEffect(() => {
    if (!canAccess || !session?.access_token) return;

    const refresh = () => {
      if (document.visibilityState === "visible") void load(true);
    };
    const interval = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [canAccess, load, session?.access_token]);

  useEffect(() => {
    if (!lastUpdated) return;
    setLastUpdatedLabel(timeAgo(lastUpdated));
    const tick = window.setInterval(() => {
      if (mountedRef.current) setLastUpdatedLabel(timeAgo(lastUpdated));
    }, 5_000);
    return () => window.clearInterval(tick);
  }, [lastUpdated]);

  const totals = data?.totals || { sent: 0, total: 0, surcharge: 0 };
  const rancho = data?.rancho;
  const usage = rancho?.usage;
  const bands = data?.bands || [];
  const loading = initialLoading;

  if (!profile || !session?.access_token) {
    return <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--text-2)]">Carregando seu acesso...</div>;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <section className="rounded-lg bg-slate-950 p-6 text-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge tone="success">Meu uso</Badge>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight md:text-5xl">Gerenciamento de uso</h1>
            <p className="mt-3 max-w-2xl text-slate-300">Acompanhe o consumo do WhatsApp do seu rancho e visualize o acréscimo provisório do mês.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              className={cn("btn bg-white text-slate-950 transition-all", refreshing && "opacity-80")}
              type="button"
              onClick={() => void load(!!data)}
              disabled={initialLoading}
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} /> Atualizar
            </button>
            {lastUpdatedLabel ? (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                {online
                  ? <Wifi className="h-3 w-3 text-emerald-400" />
                  : <WifiOff className="h-3 w-3 text-red-400" />}
                <span>Atualizado {lastUpdatedLabel}</span>
                {refreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{error}</div> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Mensagens enviadas" value={numberFormatter.format(totals.sent)} hint="Enviadas por você ao bot" icon={Send} tone="green" loading={loading} />
        <StatCard title="Faixa atual" value={usage?.band.label || "-"} hint={data?.month ? monthLabel(data.month) : "Mês atual"} icon={MessageSquareText} tone="lime" loading={loading} />
        <StatCard title="Acréscimo provisório" value={formatCurrency(totals.surcharge)} hint="Modelo de cobrança" icon={CircleDollarSign} tone="amber" loading={loading} />
        <StatCard title="Próxima faixa" value={usage?.nextBand?.label || "Maior faixa"} hint={usage?.nextBand ? `${numberFormatter.format(usage.nextBand.min - usage.total)} mensagem(ns)` : "Sem próxima faixa"} icon={ChartNoAxesCombined} tone="blue" loading={loading} />
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><ChartNoAxesCombined className="h-5 w-5 text-emerald-600" /><h2 className="text-[15px] font-semibold">Uso do meu rancho</h2></div>
            <p className="mt-1 text-sm text-[var(--text-2)]">Contagem das mensagens que você envia ao bot neste rancho.</p>
          </div>
          <Badge tone="default">{profile.fazenda?.nome || "Meu rancho"}</Badge>
        </div>

        <div className="mt-5 space-y-3">
          {loading ? <div className="rounded-lg border border-[var(--border)] p-4"><Skeleton className="h-5 w-48" /><Skeleton className="mt-3 h-4 w-full" /><Skeleton className="mt-4 h-2 w-full" /></div> : rancho ? (() => {
            const progress = usage?.percentToNextBand ?? 100;
            return (
              <article className="rounded-lg border border-[var(--border)] p-4 transition-colors hover:border-[var(--text-3)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-semibold">{rancho.nome}</h3><Badge tone={statusTone(rancho.status)}>{statusLabel(rancho.status)}</Badge><Badge tone="default">{rancho.usage.band.label}</Badge></div>
                    <p className="mt-1 text-sm text-[var(--text-2)]">Plano {rancho.plano} · {numberFormatter.format(rancho.usage.total)} mensagens no mês</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm lg:min-w-[300px]">
                    <div><p className="text-xs text-[var(--text-2)]">Você enviou</p><p className="mt-1 text-xl font-semibold tabular-nums">{numberFormatter.format(rancho.usage.sent)}</p></div>
                    <div><p className="text-xs text-[var(--text-2)]">Acréscimo</p><p className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(rancho.usage.band.additionalFee)}</p></div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-emerald-500 transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-2)]">{rancho.usage.nextBand ? `${numberFormatter.format(rancho.usage.nextBand.min - rancho.usage.total)} mensagem(ns) até a ${rancho.usage.nextBand.label.toLowerCase()}.` : "Maior faixa provisória."}</p>
                </div>
              </article>
            );
          })() : <div className="rounded-lg border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--text-2)]">Não foi possível localizar o rancho deste usuário.</div>}
        </div>
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] md:p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge tone="default">Modelo provisório</Badge>
            <h2 className="mt-3 text-[15px] font-semibold">Faixas de uso</h2>
            <p className="mt-1 text-sm text-[var(--text-2)]">A cobrança ainda não é aplicada. Estes valores servem apenas para visualizar o modelo.</p>
          </div>
          <span className="text-sm font-semibold capitalize text-[var(--text-2)]">{data?.month ? monthLabel(data.month) : "Mês atual"}</span>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {loading ? Array.from({ length: 4 }).map((_, index) => <div key={`band-skeleton-${index}`} className="rounded-lg border border-[var(--border)] p-4"><Skeleton className="h-5 w-24" /><Skeleton className="mt-3 h-4 w-40" /><Skeleton className="mt-5 h-7 w-28" /></div>) : bands.map((band) => {
            const isCurrentBand = usage?.band.key === band.key;
            return (
              <div key={band.key} className={cn(
                "rounded-lg border p-4 transition-colors",
                isCurrentBand
                  ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20"
                  : "border-[var(--border)] bg-[var(--bg)]"
              )}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{band.label}</p>
                  {isCurrentBand ? <Badge tone="success">Atual</Badge> : <Badge tone="default">Modelo</Badge>}
                </div>
                <p className="mt-2 text-sm text-[var(--text-2)]">{rangeLabel(band)}</p>
                <p className="mt-4 text-xl font-semibold tabular-nums">{formatCurrency(band.additionalFee)}</p>
                <p className="mt-1 text-xs text-[var(--text-2)]">Acréscimo provisório</p>
              </div>
            );
          })}
        </div>
      </section>

      {!loading && data?.usageAvailable === false ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">A tabela mensal de uso ainda não está disponível. Aplique a migration de uso do WhatsApp no Supabase para começar a registrar as contagens.</div> : null}
    </div>
  );
}
