"use client";

import { Download, Eye, PawPrint, Pencil, Search, Trash2, X } from "lucide-react";
import { memo, useDeferredValue, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/AsyncState";
import { Skeleton } from "@/components/ui/Skeleton";
import { getAnimalSexInfo } from "@/lib/animal-sex";
import type { AnyRecord, RelationOption } from "@/lib/types";

const ANIMAL_RENDER_BATCH_SIZE = 72;

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

function displayLabel(map: Record<string, string>, value: unknown, fallback = "-") {
  return map[String(value || "")] || String(value || fallback);
}

function phaseTone(value: unknown) {
  if (value === "gestante") return "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300";
  if (value === "lactacao") return "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300";
  if (value === "vazia") return "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
  if (value === "seca") return "bg-[var(--bg)] text-[var(--text-2)]";
  return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
}

function normalizeSexValue(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

function getAnimalSexVisual(animal: AnyRecord) {
  const sex = normalizeSexValue(
    animal.sexo ||
    animal.sex ||
    animal.genero ||
    animal.gender
  );

  const isMale = ["macho", "m", "male", "masculino"].includes(sex);
  const isFemale = ["femea", "f", "female", "feminino"].includes(sex);

  if (isMale) {
    return {
      stripe: "bg-blue-400",
      badge: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300"
    };
  }

  if (isFemale) {
    return {
      stripe: "bg-pink-400",
      badge: "bg-pink-50 text-pink-600 dark:bg-pink-950/50 dark:text-pink-300"
    };
  }

  return {
    stripe: "bg-[var(--text-3)]",
    badge: "bg-[var(--bg)] text-[var(--text-2)]"
  };
}

function AnimalCardSkeleton() {
  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="flex items-start gap-3">
        <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="mt-2 h-3.5 w-16" />
        </div>
        <Skeleton className="h-5 w-14 rounded" />
      </div>
      <div className="mt-3 flex gap-2">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-10" />
      </div>
    </article>
  );
}

export const AnimalCards = memo(function AnimalCards({
  rows,
  search,
  setSearch,
  relationOptions,
  loading,
  onView,
  onEdit,
  onDelete,
  onExport,
  canManage = true
}: {
  rows: AnyRecord[];
  search: string;
  setSearch: (value: string) => void;
  relationOptions: Record<string, RelationOption[]>;
  loading?: boolean;
  onView: (row: AnyRecord) => void;
  onEdit: (row: AnyRecord) => void;
  onDelete: (id: string) => void;
  onExport: (rows: AnyRecord[]) => void;
  canManage?: boolean;
}) {
  const [loteFilter, setLoteFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [visibleLimit, setVisibleLimit] = useState(ANIMAL_RENDER_BATCH_SIZE);
  const deferredSearch = useDeferredValue(search);

  const loteLookup = useMemo(
    () => Object.fromEntries((relationOptions.lote_id || []).map((option) => [option.value, option.label])),
    [relationOptions.lote_id]
  );

  const statusOptions = useMemo(() => {
    const values = Array.from(new Set(rows.map((row) => String(row.status || "")).filter(Boolean)));
    return values.map((value) => ({ value, label: displayLabel(statusLabels, value) }));
  }, [rows]);

  const filteredAnimals = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();

    return rows.filter((animal) => {
      if (loteFilter && animal.lote_id !== loteFilter) return false;
      if (statusFilter && animal.status !== statusFilter) return false;
      if (!term) return true;

      const text = [
        animal.brinco,
        animal.nome,
        displayLabel(categoryLabels, animal.categoria),
        displayLabel(phaseLabels, animal.fase),
        displayLabel(statusLabels, animal.status),
        getAnimalSexInfo(animal).label,
        animal.raca,
        animal.peso,
        loteLookup[String(animal.lote_id || "")]
      ].filter(Boolean).join(" ").toLowerCase();

      return text.includes(term);
    });
  }, [deferredSearch, loteFilter, loteLookup, rows, statusFilter]);

  const visibleAnimals = useMemo(
    () => filteredAnimals.slice(0, visibleLimit),
    [filteredAnimals, visibleLimit]
  );
  const hasActiveFilters = Boolean(deferredSearch.trim() || loteFilter || statusFilter);

  useEffect(() => {
    setVisibleLimit(ANIMAL_RENDER_BATCH_SIZE);
  }, [deferredSearch, loteFilter, rows.length, statusFilter]);

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] md:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-3)]" />
            <input
              className="input"
              style={{ paddingLeft: "2.25rem", paddingRight: search ? "2.25rem" : undefined }}
              placeholder="Buscar por nome, brinco, raça, fase ou lote..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search ? (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--text-3)] transition-colors hover:bg-[var(--bg)] hover:text-[var(--text)]"
                type="button"
                onClick={() => setSearch("")}
                title="Limpar busca"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </label>

          <div className="grid gap-2 sm:grid-cols-3 lg:w-[30rem]">
            <select className="input" value={loteFilter} onChange={(event) => setLoteFilter(event.target.value)}>
              <option value="">Todos os lotes</option>
              {(relationOptions.lote_id || []).map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">Todos os status</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <button className="btn btn-secondary text-[13px]" type="button" onClick={() => onExport(filteredAnimals)}>
              <Download className="h-4 w-4" /> Exportar
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-[13px] text-[var(--text-2)]">
          {loading ? <Skeleton className="h-4 w-28" /> : <span className="font-medium text-[var(--text)]">{filteredAnimals.length} animais</span>}
          <span>encontrados</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {loading ? Array.from({ length: 6 }).map((_, index) => <AnimalCardSkeleton key={`animal-skeleton-${index}`} />) : filteredAnimals.length ? visibleAnimals.map((animal) => {
          const lote = loteLookup[String(animal.lote_id || "")] || "Sem lote";
          const phase = displayLabel(phaseLabels, animal.fase, "Sem fase");
          const category = displayLabel(categoryLabels, animal.categoria, "Animal");
          const sex = getAnimalSexInfo(animal);
          const sexVisual = getAnimalSexVisual(animal);

          return (
            <article
              key={animal.id}
              className="group relative cursor-pointer overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 pl-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:border-[var(--text-3)]"
              onClick={() => onView(animal)}
            >
              <span className={`absolute inset-y-0 left-0 w-[3px] ${sexVisual.stripe}`} aria-hidden="true" />

              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-[15px] font-semibold tracking-tight">
                    {animal.nome || animal.brinco || "Sem brinco"}
                  </h3>
                  <p className="mt-0.5 truncate text-xs text-[var(--text-2)]">
                    {animal.nome ? animal.brinco || "Sem brinco" : category} · {animal.raca || "Sem raça"}
                  </p>
                </div>
                <span className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold ${phaseTone(animal.fase)}`}>
                  {phase}
                </span>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-3)]">
                <span>{lote}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${sexVisual.badge}`}>{sex.label}</span>
                {animal.peso ? <span>{animal.peso} kg</span> : null}
              </div>

              <div className="mt-3 flex gap-1.5 border-t border-[var(--border-light)] pt-3">
                <button
                  className="btn btn-primary flex-1 py-1.5 text-xs"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onView(animal);
                  }}
                >
                  <Eye className="h-3.5 w-3.5" /> Ver ficha
                </button>

                {canManage ? (
                  <>
                    <button
                      className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-1.5 text-[var(--text-2)] transition-colors hover:bg-[var(--bg)]"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEdit(animal);
                      }}
                      title="Editar animal"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="rounded-md border border-red-200 bg-[var(--surface)] p-1.5 text-red-500 transition-colors hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete(animal.id);
                      }}
                      title="Excluir animal"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : null}
              </div>
            </article>
          );
        }) : (
          <EmptyState
            className="sm:col-span-2 xl:col-span-3 2xl:col-span-4"
            title={hasActiveFilters ? "Nenhum animal encontrado com esses filtros." : "Voce ainda nao cadastrou animais."}
            message={hasActiveFilters ? "Limpe a busca ou ajuste os filtros para ver mais resultados." : "Cadastre o primeiro animal para acompanhar rebanho, producao e eventos."}
          />
        )}
      </div>
      {!loading && filteredAnimals.length > visibleLimit ? (
        <div className="flex justify-center">
          <button className="btn btn-secondary" type="button" onClick={() => setVisibleLimit((current) => current + ANIMAL_RENDER_BATCH_SIZE)}>
            Mostrar mais animais
          </button>
        </div>
      ) : null}
    </section>
  );
});
