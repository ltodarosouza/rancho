"use client";

import {
  ChartNoAxesCombined,
  CircleDollarSign,
  Inbox,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Send,
  ShieldCheck
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/StatCard";
import { useAuth } from "@/lib/auth-context";
import { PLATFORM_ADMIN_FORBIDDEN_MESSAGE, canAccessPlatformAdmin } from "@/lib/platform-admin";
import { formatCurrency } from "@/lib/utils";

type UsageBand = {
  key: string;
  label: string;
  min: number;
  max: number | null;
  additionalFee: number;
};

type UsageBandOverview = UsageBand & {
  ranchos: number;
  messages: number;
};

type RanchoUsage = {
  id: string;
  nome: string;
  plano: string;
  status: string;
  ativa: boolean;
  usage: {
    available: boolean;
    received: number;
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
  totals?: { received: number; sent: number; total: number; surcharge: number };
  bands?: UsageBandOverview[];
  ranchos?: RanchoUsage[];
};

const numberFormatter = new Intl.NumberFormat("pt-BR");

function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return value;
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

function rangeLabel(band: UsageBand) {
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

export default function GerenciamentoUsoPage() {
  const { profile, session } = useAuth();
  const canAccess = canAccessPlatformAdmin(profile);
  const [data, setData] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!canAccess || !session?.access_token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/platform/uso-whatsapp", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store"
      });
      const result = await response.json().catch(() => ({})) as UsageResponse;
      if (!response.ok) throw new Error(result.error || "Não foi possível carregar o uso do WhatsApp.");
      setData(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar o uso do WhatsApp.");
    } finally {
      setLoading(false);
    }
  }, [canAccess, session?.access_token]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = data?.totals || { received: 0, sent: 0, total: 0, surcharge: 0 };
  const ranchos = data?.ranchos || [];
  const bands = data?.bands || [];
  const average = useMemo(() => ranchos.length ? Math.round(totals.total / ranchos.length) : 0, [ranchos.length, totals.total]);

  if (!canAccess) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-in rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6" />
          <h1 className="text-[15px] font-semibold">Gerenciamento de uso</h1>
        </div>
        <p className="mt-3 text-sm font-bold">{PLATFORM_ADMIN_FORBIDDEN_MESSAGE}</p>
        <a className="btn btn-secondary mt-5" href="/dashboard">Voltar ao dashboard</a>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <section className="rounded-lg bg-slate-950 p-6 text-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge tone="success">Área interna</Badge>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight md:text-5xl">Gerenciamento de uso</h1>
            <p className="mt-3 max-w-2xl text-slate-300">Acompanhe as mensagens do WhatsApp por rancho e visualize o acréscimo provisório do mês.</p>
          </div>
          <button className="btn bg-white text-slate-950" type="button" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="h-4 w-4" /> Atualizar
          </button>
        </div>
      </section>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{error}</div> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Mensagens recebidas" value={numberFormatter.format(totals.received)} hint="Enviadas pelos usuários" icon={Inbox} tone="blue" loading={loading} />
        <StatCard title="Respostas enviadas" value={numberFormatter.format(totals.sent)} hint="Enviadas pelo bot" icon={Send} tone="green" loading={loading} />
        <StatCard title="Total contabilizado" value={numberFormatter.format(totals.total)} hint={data?.month ? monthLabel(data.month) : "Mês atual"} icon={MessageSquareText} tone="lime" loading={loading} />
        <StatCard title="Acréscimo provisório" value={formatCurrency(totals.surcharge)} hint={`${numberFormatter.format(ranchos.length)} rancho(s) · média ${numberFormatter.format(average)}/mês`} icon={CircleDollarSign} tone="amber" loading={loading} />
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
          {loading ? Array.from({ length: 4 }).map((_, index) => <div key={`band-skeleton-${index}`} className="rounded-lg border border-[var(--border)] p-4"><Skeleton className="h-5 w-24" /><Skeleton className="mt-3 h-4 w-40" /><Skeleton className="mt-5 h-7 w-28" /></div>) : bands.map((band) => (
            <div key={band.key} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
              <div className="flex items-center justify-between gap-2"><p className="font-semibold">{band.label}</p><Badge tone="default">{band.ranchos} rancho(s)</Badge></div>
              <p className="mt-2 text-sm text-[var(--text-2)]">{rangeLabel(band)}</p>
              <p className="mt-4 text-xl font-semibold">{formatCurrency(band.additionalFee)}</p>
              <p className="mt-1 text-xs text-[var(--text-2)]">Acréscimo provisório · {numberFormatter.format(band.messages)} mensagens na faixa</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><ChartNoAxesCombined className="h-5 w-5 text-emerald-600" /><h2 className="text-[15px] font-semibold">Uso por rancho</h2></div>
            <p className="mt-1 text-sm text-[var(--text-2)]">Recebidas e respostas do bot ficam separadas para facilitar a futura cobrança.</p>
          </div>
          <Badge tone="default">{numberFormatter.format(ranchos.length)} cliente(s)</Badge>
        </div>

        <div className="mt-5 space-y-3">
          {loading ? Array.from({ length: 4 }).map((_, index) => <div key={`rancho-skeleton-${index}`} className="rounded-lg border border-[var(--border)] p-4"><Skeleton className="h-5 w-48" /><Skeleton className="mt-3 h-4 w-full" /><Skeleton className="mt-4 h-2 w-full" /></div>) : ranchos.length ? ranchos.map((rancho) => {
            const progress = rancho.usage.percentToNextBand ?? 100;
            return (
              <article key={rancho.id} className="rounded-lg border border-[var(--border)] p-4 transition-colors hover:border-[var(--text-3)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-semibold">{rancho.nome}</h3><Badge tone={statusTone(rancho.status)}>{statusLabel(rancho.status)}</Badge><Badge tone="default">{rancho.usage.band.label}</Badge></div>
                    <p className="mt-1 text-sm text-[var(--text-2)]">Plano {rancho.plano} · {numberFormatter.format(rancho.usage.total)} mensagens no mês</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm lg:min-w-[420px]">
                    <div><p className="text-xs text-[var(--text-2)]">Recebidas</p><p className="mt-1 font-semibold">{numberFormatter.format(rancho.usage.received)}</p></div>
                    <div><p className="text-xs text-[var(--text-2)]">Bot enviou</p><p className="mt-1 font-semibold">{numberFormatter.format(rancho.usage.sent)}</p></div>
                    <div><p className="text-xs text-[var(--text-2)]">Acréscimo</p><p className="mt-1 font-semibold">{formatCurrency(rancho.usage.band.additionalFee)}</p></div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} /></div>
                  <p className="mt-2 text-xs text-[var(--text-2)]">{rancho.usage.nextBand ? `${numberFormatter.format(rancho.usage.nextBand.min - rancho.usage.total)} mensagem(ns) até a ${rancho.usage.nextBand.label.toLowerCase()}.` : "Maior faixa provisória."}</p>
                </div>
              </article>
            );
          }) : <div className="rounded-lg border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--text-2)]">Nenhum rancho cadastrado ainda.</div>}
        </div>
      </section>

      {!loading && data?.usageAvailable === false ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">A tabela mensal de uso ainda não está disponível. Aplique a migration de uso do WhatsApp no Supabase para começar a registrar as contagens.</div> : null}
      {loading ? <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div> : null}
    </div>
  );
}
