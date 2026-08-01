"use client";

import Link from "next/link";
import { Activity, ClipboardList, Heart, Plus, Stethoscope, TrendingUp, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { createRecord, listRecords } from "@/services/crud";
import { syncAnimalPhaseAfterEvent } from "@/services/animal-lifecycle";
import { notifyDashboardUpdated } from "@/services/dashboard";
import { syncEventCostToFinance } from "@/services/event-finance";
import { getAnimalSexInfo } from "@/lib/animal-sex";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { TABLES } from "@/lib/tables";
import type { AnyRecord, DataContext, RelationOption } from "@/lib/types";
import { formatCurrency, formatDate, formatNumber, nowLocalDatetime, parseLocalDate } from "@/lib/utils";
import { animalBlockedMessage, isAnimalInactiveForBot } from "@/lib/whatsapp/animal-status";

type Tab = "resumo" | "reproducao" | "timeline";

const eventTypes = [
  { label: "Observação", value: "observacao" },
  { label: "Vacina", value: "vacina" },
  { label: "Tratamento", value: "tratamento" },
  { label: "Pesagem", value: "pesagem" },
  { label: "Inseminação", value: "inseminacao" },
  { label: "Parto", value: "parto" },
  { label: "Doença", value: "doenca" },
  { label: "Outro", value: "outro" }
];

const categoryLabels: Record<string, string> = {
  vaca: "Vaca",
  boi: "Boi",
  bezerro: "Bezerro",
  bezerra: "Bezerra",
  novilha: "Novilha",
  touro: "Touro",
  outro: "Outro"
};

const phaseLabels: Record<string, string> = {
  lactacao: "Lactação",
  seca: "Seca",
  gestante: "Gestante",
  vazia: "Vazia",
  crescimento: "Crescimento",
  engorda: "Engorda",
  nao_aplicavel: "Não aplicável"
};

const statusLabels: Record<string, string> = {
  ativo: "Ativo",
  vendido: "Vendido",
  morto: "Morto",
  inativo: "Inativo"
};

function labelFromOptions(options: RelationOption[] | undefined, value: unknown) {
  return options?.find((option) => option.value === String(value))?.label || "";
}

function labelFromMap(map: Record<string, string>, value: unknown, fallback = "-") {
  return map[String(value || "")] || String(value || fallback);
}

function startOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function dateTime(value: unknown) {
  return parseLocalDate(String(value || ""))?.getTime() || 0;
}

function isPartoEvent(event: AnyRecord) {
  return String(event.tipo || "").trim().toLowerCase() === "parto";
}

function daysSince(value: unknown) {
  const date = parseLocalDate(String(value || ""));
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
}

const ANIMAL_DETAIL_EVENTS_SELECT = "id,animal_id,tipo,data_evento,descricao,medicamento,dose,custo,created_at";
const ANIMAL_DETAIL_PRODUCTIONS_SELECT = "id,animal_id,litros,turno,ordenhado_em,destino,created_at";

export function AnimalDetailModal({
  animal,
  context,
  relationOptions,
  onClose,
  onChanged
}: {
  animal: AnyRecord;
  context: DataContext;
  relationOptions: Record<string, RelationOption[]>;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
}) {
  const [tab, setTab] = useState<Tab>("resumo");
  const [events, setEvents] = useState<AnyRecord[]>([]);
  const [productions, setProductions] = useState<AnyRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({
    tipo: "observacao",
    data_evento: nowLocalDatetime(),
    descricao: "",
    medicamento: "",
    dose: "",
    custo: ""
  });

  const loadDetails = useCallback(async (forceRefresh = false) => {
    setDetailsLoading(true);
    try {
      const [animalEvents, animalProductions] = await Promise.all([
        listRecords(TABLES.eventosAnimal, {
          orderBy: "data_evento",
          fazendaId: context.fazendaId,
          usuarioId: context.usuarioId,
          select: ANIMAL_DETAIL_EVENTS_SELECT,
          filters: [{ column: "animal_id", value: animal.id }],
          cache: true,
          forceRefresh
        }),
        listRecords(TABLES.ordenhas, {
          orderBy: "ordenhado_em",
          fazendaId: context.fazendaId,
          usuarioId: context.usuarioId,
          select: ANIMAL_DETAIL_PRODUCTIONS_SELECT,
          filters: [{ column: "animal_id", value: animal.id }],
          cache: true,
          forceRefresh
        })
      ]);

      setEvents(animalEvents);
      setProductions(animalProductions);
    } finally {
      setDetailsLoading(false);
    }
  }, [animal.id, context.fazendaId, context.usuarioId]);

  useEffect(() => {
    loadDetails().catch((err) => setError(getFriendlyErrorMessage(err, "Não foi possível carregar a ficha.")));
  }, [loadDetails]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const metrics = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const monthStart = startOfCurrentMonth();

    const last7 = productions.filter((production) => dateTime(production.ordenhado_em) >= sevenDaysAgo.getTime());
    const last30 = productions.filter((production) => dateTime(production.ordenhado_em) >= thirtyDaysAgo.getTime());
    const monthEvents = events.filter((event) => dateTime(event.data_evento) >= monthStart.getTime());

    return {
      dailyAverage: last7.reduce((sum, row) => sum + Number(row.litros || 0), 0) / 7,
      production30: last30.reduce((sum, row) => sum + Number(row.litros || 0), 0),
      monthCost: monthEvents.reduce((sum, row) => sum + Number(row.custo || 0), 0),
      eventCount: events.length
    };
  }, [events, productions]);

  const timeline = useMemo(() => {
    const eventEntries = events.map((event) => ({
      id: `event-${event.id}`,
      date: event.data_evento,
      title: eventTypes.find((type) => type.value === event.tipo)?.label || event.tipo,
      text: event.descricao || event.medicamento || "Registro de manejo",
      tone: "manejo"
    }));

    const productionEntries = productions.map((production) => ({
      id: `production-${production.id}`,
      date: production.ordenhado_em,
      title: "Ordenha",
      text: `${formatNumber(production.litros, " L")} - ${production.turno || "turno não informado"}`,
      tone: "producao"
    }));

    return [...eventEntries, ...productionEntries]
      .sort((a, b) => dateTime(b.date) - dateTime(a.date))
      .slice(0, 20);
  }, [events, productions]);

  function openEventForm(tipo = "observacao", descricao = "") {
    setDraft({
      tipo,
      data_evento: nowLocalDatetime(),
      descricao,
      medicamento: "",
      dose: "",
      custo: ""
    });
    setShowForm(true);
  }

  async function submitEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      if (isAnimalInactiveForBot(animal)) {
        throw new Error(animalBlockedMessage(animal, "novas movimentações"));
      }

      const eventDate = draft.data_evento ? new Date(draft.data_evento).toISOString() : new Date().toISOString();
      const cost = Number(draft.custo || 0);

      const created = await createRecord(TABLES.eventosAnimal, {
        animal_id: animal.id,
        tipo: draft.tipo,
        data_evento: eventDate,
        descricao: draft.descricao,
        medicamento: draft.medicamento,
        dose: draft.dose,
        custo: cost
      }, context);

      await syncEventCostToFinance(
        created || { animal_id: animal.id, tipo: draft.tipo, data_evento: eventDate, descricao: draft.descricao, medicamento: draft.medicamento, custo: cost },
        context,
        [{ value: String(animal.id), label: animal.brinco || animal.nome || "Animal" }]
      );
      await syncAnimalPhaseAfterEvent(created || { animal_id: animal.id, tipo: draft.tipo }, context);

      notifyDashboardUpdated();
      setShowForm(false);
      await loadDetails(true);
      await onChanged();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, "Não foi possível registrar o manejo."));
    } finally {
      setBusy(false);
    }
  }

  const lote = labelFromOptions(relationOptions.lote_id, animal.lote_id) || "Sem lote";
  const categoria = labelFromMap(categoryLabels, animal.categoria, "Animal");
  const fase = labelFromMap(phaseLabels, animal.fase);
  const status = labelFromMap(statusLabels, animal.status, "Ativo");
  const sex = getAnimalSexInfo(animal);
  const lastParto = useMemo(() => events.filter(isPartoEvent).sort((a, b) => dateTime(b.data_evento || b.created_at) - dateTime(a.data_evento || a.created_at))[0] || null, [events]);
  const lastPartoDays = lastParto ? daysSince(lastParto.data_evento || lastParto.created_at) : null;
  const reproductiveStatus = lastParto && lastPartoDays !== null && lastPartoDays >= 0 && lastPartoDays <= 45
    ? "Recém-parida"
    : animal.fase === "gestante" ? "Gestante" : animal.fase === "lactacao" ? "Em lactação" : animal.fase === "vazia" ? "Vazia" : "Acompanhar";
  const reproductiveStatusDetail = lastParto
    ? `Último parto: ${formatDate(lastParto.data_evento || lastParto.created_at)}`
    : "Baseado no histórico de eventos e na fase atual.";

  const showDetailPlaceholders = detailsLoading || Boolean(error && !events.length && !productions.length);

  return (
    <div className="fixed inset-y-0 left-0 right-0 z-40 bg-[var(--bg)] text-[var(--text)] lg:left-56">
      <section className="flex h-dvh w-full animate-fade-in flex-col overflow-hidden">
        <header className="shrink-0 border-b border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)]">Ficha do animal</p>
              <h2 className="mt-1 truncate text-2xl font-semibold tracking-tight">{animal.nome || animal.brinco || "Animal"}</h2>
              {animal.nome ? <p className="mt-0.5 text-sm text-[var(--text-2)]">Código: {animal.brinco || "Sem brinco"}</p> : null}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--text-2)]">
                <span>{categoria} · {fase || "Fase não informada"} · {lote}</span>
                <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${sex.className}`}>{sex.label}</span>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button className="btn btn-primary" type="button" onClick={() => openEventForm()}>
                <Plus className="h-4 w-4" /> Novo manejo
              </button>
              <Link className="btn btn-secondary" href={`/genealogia?animal=${animal.id}`} onClick={onClose}>
                Ver genealogia
              </Link>
              <button className="rounded-md border border-[var(--border)] p-2.5 transition-colors hover:bg-[var(--bg)]" type="button" onClick={onClose} title="Fechar">
                <X className="h-5 w-5 text-[var(--text-2)]" />
              </button>
            </div>
          </div>
        </header>

        <div className="shrink-0 border-b border-[var(--border)] bg-[var(--surface)] px-4">
          <nav className="mx-auto flex max-w-[1200px] gap-6 overflow-auto">
            {[
              ["resumo", "Resumo"],
              ["reproducao", "Reprodução"],
              ["timeline", "Timeline"]
            ].map(([value, label]) => (
              <button
                key={value}
                className={`border-b-2 px-1 py-3 text-sm font-semibold transition ${tab === value ? "border-emerald-600 text-emerald-700 dark:text-emerald-400" : "border-transparent text-[var(--text-3)] hover:text-[var(--text)]"}`}
                type="button"
                onClick={() => setTab(value as Tab)}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--bg)] p-3 md:p-4">
          <div className="mx-auto max-w-[1200px]">
          {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{error}</div> : null}

          {tab === "resumo" ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <p className="mt-2.5 text-[13px] font-medium text-[var(--text-2)]">Média leite/dia</p>
                  <p className="text-[11px] text-[var(--text-3)]">Últimos 7 dias</p>
                  {showDetailPlaceholders ? <Skeleton className="mt-2 h-7 w-24" /> : <h3 className="mt-2 text-xl font-semibold tabular-nums">{formatNumber(metrics.dailyAverage, " L")}</h3>}
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                  <Activity className="h-4 w-4 text-emerald-500" />
                  <p className="mt-2.5 text-[13px] font-medium text-[var(--text-2)]">Produção recente</p>
                  <p className="text-[11px] text-[var(--text-3)]">Últimos 30 dias</p>
                  {showDetailPlaceholders ? <Skeleton className="mt-2 h-7 w-24" /> : <h3 className="mt-2 text-xl font-semibold tabular-nums">{formatNumber(metrics.production30, " L")}</h3>}
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                  <Stethoscope className="h-4 w-4 text-amber-500" />
                  <p className="mt-2.5 text-[13px] font-medium text-[var(--text-2)]">Custo de saúde</p>
                  <p className="text-[11px] text-[var(--text-3)]">Mês atual</p>
                  {showDetailPlaceholders ? <Skeleton className="mt-2 h-7 w-28" /> : <h3 className="mt-2 text-xl font-semibold tabular-nums">{formatCurrency(metrics.monthCost)}</h3>}
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                  <Heart className="h-4 w-4 text-purple-500" />
                  <p className="mt-2.5 text-[13px] font-medium text-[var(--text-2)]">Status reprodutivo</p>
                  <p className="text-[11px] text-[var(--text-3)]">Snapshot atual</p>
                  <h3 className="mt-2 text-xl font-semibold">{reproductiveStatus}</h3>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)]">Caderno de manejo</p>
                      <h3 className="mt-1 text-[15px] font-semibold">Saúde e histórico do animal</h3>
                    </div>
                    <button className="btn btn-secondary" type="button" onClick={() => openEventForm()}>
                      <Plus className="h-4 w-4" /> Registrar
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-md bg-[var(--bg)] p-3"><p className="text-xs text-[var(--text-3)]">Manejos</p>{showDetailPlaceholders ? <Skeleton className="mt-2 h-5 w-12" /> : <strong className="text-sm">{metrics.eventCount}</strong>}</div>
                    <div className="rounded-md bg-[var(--bg)] p-3"><p className="text-xs text-[var(--text-3)]">Peso atual</p><strong className="text-sm">{formatNumber(animal.peso, " kg")}</strong></div>
                    <div className="rounded-md bg-[var(--bg)] p-3"><p className="text-xs text-[var(--text-3)]">Status</p><strong className="text-sm">{status}</strong></div>
                  </div>
                </section>

                <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)]">Dados do animal</p>
                  <div className="mt-3 space-y-2 text-sm">
                    {[
                      ["Nome", animal.nome || "-"],
                      ["Código", animal.brinco || "-"],
                      ["Categoria", categoria],
                      ["Sexo", sex.label],
                      ["Fase", fase],
                      ["Reprodução", reproductiveStatus],
                      ["Último parto", lastParto ? formatDate(lastParto.data_evento || lastParto.created_at) : "-"],
                      ["Raça", animal.raca || "-"],
                      ["Lote", lote],
                      ["Nascimento", formatDate(animal.data_nascimento)],
                      ["Observações", animal.observacoes || "-"]
                    ].map(([label, value]) => (
                      <div className="flex items-start justify-between gap-4 border-b border-[var(--border-light)] pb-2 last:border-0" key={label}>
                        <span className="text-[var(--text-3)]">{label}</span>
                        <strong className="text-right text-[var(--text)]">{value}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          ) : null}

          {tab === "reproducao" ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-purple-200 bg-purple-50 p-5 dark:border-purple-900 dark:bg-purple-950/30">
                <div className="flex items-center gap-2 text-purple-800 dark:text-purple-200">
                  <Heart className="h-5 w-5" />
                  <strong className="text-sm">Status reprodutivo atual</strong>
                </div>
                <h3 className="mt-3 text-2xl font-semibold">{reproductiveStatus}</h3>
                <p className="mt-1.5 text-sm text-[var(--text-2)]">{reproductiveStatusDetail}</p>
              </div>

              <button className="btn w-full bg-purple-600 text-white" type="button" onClick={() => openEventForm("inseminacao", "Cobertura / inseminação registrada.")}>
                Registrar cobertura / inseminação
              </button>
              <button className="btn w-full bg-blue-600 text-white" type="button" onClick={() => openEventForm("observacao", "Diagnóstico reprodutivo: ")}>
                Registrar diagnóstico
              </button>
            </div>
          ) : null}

          {tab === "timeline" ? (
            <div className="space-y-3">
              {showDetailPlaceholders ? Array.from({ length: 4 }).map((_, index) => (
                <div key={`timeline-skeleton-${index}`} className="flex gap-3 rounded-lg border border-[var(--border)] p-4">
                  <Skeleton className="mt-1 h-3 w-3 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Skeleton className="h-5 w-28" />
                      <Skeleton className="h-6 w-20 rounded" />
                    </div>
                    <Skeleton className="mt-3 h-4 w-64 max-w-full" />
                  </div>
                </div>
              )) : timeline.length ? timeline.map((entry) => (
                <div key={entry.id} className="flex gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                  <div className={`mt-1 h-3 w-3 rounded-full ${entry.tone === "producao" ? "bg-blue-500" : "bg-emerald-500"}`} />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm">{entry.title}</strong>
                      <Badge tone={entry.tone === "producao" ? "info" : "success"}>{formatDate(entry.date)}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-[var(--text-2)]">{entry.text}</p>
                  </div>
                </div>
              )) : (
                <div className="rounded-lg border border-dashed border-[var(--border)] p-8 text-center text-[var(--text-3)]">
                  Nenhum registro no histórico ainda.
                </div>
              )}
            </div>
          ) : null}

          {showForm ? (
            <form onSubmit={submitEvent} className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-[15px] font-semibold">Novo registro de manejo</h3>
                  <p className="text-sm text-[var(--text-2)]">Esse registro fica vinculado ao animal {animal.brinco}.</p>
                </div>
                <button className="rounded-md border border-[var(--border)] p-2" type="button" onClick={() => setShowForm(false)}>
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-sm font-medium">Tipo</span>
                  <select className="input" value={draft.tipo} onChange={(event) => setDraft((current) => ({ ...current, tipo: event.target.value }))}>
                    {eventTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">Data e hora</span>
                  <input className="input" type="datetime-local" value={draft.data_evento} onChange={(event) => setDraft((current) => ({ ...current, data_evento: event.target.value }))} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">Custo</span>
                  <input className="input" type="number" step="0.01" value={draft.custo} onChange={(event) => setDraft((current) => ({ ...current, custo: event.target.value }))} />
                </label>
              </div>

              <label className="mt-4 block space-y-2">
                <span className="text-sm font-medium">Descrição</span>
                <textarea className="input min-h-24 resize-y" value={draft.descricao} onChange={(event) => setDraft((current) => ({ ...current, descricao: event.target.value }))} />
              </label>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium">Medicamento</span>
                  <input className="input" value={draft.medicamento} onChange={(event) => setDraft((current) => ({ ...current, medicamento: event.target.value }))} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">Dose</span>
                  <input className="input" value={draft.dose} onChange={(event) => setDraft((current) => ({ ...current, dose: event.target.value }))} />
                </label>
              </div>

              <button className="btn btn-primary mt-4" type="submit" disabled={busy}>
                <ClipboardList className="h-4 w-4" /> {busy ? "Salvando..." : "Salvar manejo"}
              </button>
            </form>
          ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
