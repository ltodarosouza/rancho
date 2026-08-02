"use client";

import { ArrowDownCircle, ArrowUpCircle, ArrowDownUp, Download, Eye, Filter, Pencil, Search, Trash2, X } from "lucide-react";
import { memo, useMemo } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { AnyRecord, ModuleField, RelationOption } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { isFinancialExpense, isFinancialIncome } from "@/lib/finance";

export type DataTableFilter = {
  key: string;
  label: string;
  type: "select" | "number" | "date";
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
  step?: string;
};

function renderCell(row: AnyRecord, field: ModuleField, lookups?: Record<string, Record<string, string>>) {
  const value = row[field.name];
  const isIncome = isFinancialIncome(row);
  const isExpense = isFinancialExpense(row);

  if (field.type === "currency") {
    const tone = isIncome ? "text-emerald-600 dark:text-emerald-400" : isExpense ? "text-red-600 dark:text-red-400" : "";
    return <span className={`font-semibold tabular-nums ${tone}`}>{formatCurrency(value)}</span>;
  }
  if (field.type === "date" || field.type === "datetime-local" || field.type === "month") return formatDate(value);
  if (field.type === "number") return String(value ?? 0);
  if (field.type === "checkbox") return value ? <Badge tone="success">Sim</Badge> : <Badge tone="default">Não</Badge>;
  if (field.type === "relation") return lookups?.[field.name]?.[String(value)] || String(value ?? "-");
  if (field.type === "select") {
    const label = field.options?.find((option) => option.value === value)?.label || value || "-";
    const tone = ["ativo", "pago", "boa", "entrada", "ok", "manha"].includes(String(value))
      ? "success"
      : ["pendente", "ferias", "vacinacao_pendente", "aberta", "rascunho"].includes(String(value))
        ? "warning"
        : ["saida", "atrasado", "morto", "tratamento", "descartar", "cancelada"].includes(String(value))
          ? "danger"
          : "default";
    if (field.name === "tipo" && (isIncome || isExpense)) {
      const Icon = isIncome ? ArrowUpCircle : ArrowDownCircle;
      return (
        <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-semibold ${isIncome ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300"}`}>
          <Icon className="h-3.5 w-3.5" />
          {isIncome ? "Entrada" : "Saída"}
        </span>
      );
    }
    return <Badge tone={tone as any}>{label}</Badge>;
  }
  return String(value ?? "-");
}

export const DataTable = memo(function DataTable({
  rows,
  fields,
  search,
  setSearch,
  onDelete,
  onEdit,
  onView,
  onExport,
  relationOptions = {},
  loading = false,
  canManage = true,
  emptyMessage = "Nenhum registro encontrado.",
  filters = [],
  filterValues = {},
  onFilterChange,
  sortOptions = [],
  sortValue = "default",
  onSortChange,
  onClearFilters
}: {
  rows: AnyRecord[];
  fields: ModuleField[];
  search: string;
  setSearch: (value: string) => void;
  onDelete: (id: string) => void;
  onEdit: (row: AnyRecord) => void;
  onView?: (row: AnyRecord) => void;
  onExport: () => void;
  relationOptions?: Record<string, RelationOption[]>;
  loading?: boolean;
  canManage?: boolean;
  emptyMessage?: string;
  filters?: DataTableFilter[];
  filterValues?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  sortOptions?: Array<{ label: string; value: string }>;
  sortValue?: string;
  onSortChange?: (value: string) => void;
  onClearFilters?: () => void;
}) {
  const visibleFields = useMemo(() => fields.filter((field) => field.tableVisible !== false).slice(0, 8), [fields]);
  const lookups = useMemo(() => Object.entries(relationOptions).reduce<Record<string, Record<string, string>>>((acc, [field, options]) => {
    acc[field] = Object.fromEntries(options.map((option) => [option.value, option.label]));
    return acc;
  }, {}), [relationOptions]);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] p-3 md:flex-row md:items-center md:justify-between md:p-4">
        <label className="relative flex-1 md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-3)]" />
          <input className="input input-with-icon" style={{ paddingLeft: "2.25rem" }} placeholder="Buscar..." value={search} onChange={(event) => setSearch(event.target.value)} />
          {search ? (
            <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--text-3)] transition-colors hover:bg-[var(--bg)] hover:text-[var(--text)]" onClick={() => setSearch("")} type="button" title="Limpar busca">
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </label>
        <button className="btn btn-secondary text-[13px]" onClick={onExport} type="button">
          <Download className="h-4 w-4" /> Exportar CSV
        </button>
      </div>
      {filters.length || sortOptions.length ? (
        <div className="flex flex-wrap items-end gap-2 border-b border-[var(--border)] bg-[var(--bg)]/50 p-3">
          <div className="mr-1 flex items-center gap-1.5 pb-1 text-xs font-semibold text-[var(--text-2)]">
            <Filter className="h-3.5 w-3.5" /> Filtros
          </div>
          {filters.map((filter) => (
            <label key={filter.key} className="flex min-w-[9rem] flex-col gap-1 text-[11px] font-medium text-[var(--text-2)]">
              <span>{filter.label}</span>
              {filter.type === "select" ? (
                <select
                  className="input h-9 min-w-[9rem] py-1 text-xs"
                  value={filterValues[filter.key] || ""}
                  onChange={(event) => onFilterChange?.(filter.key, event.target.value)}
                >
                  {(filter.options || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              ) : (
                <input
                  className="input h-9 min-w-[9rem] py-1 text-xs"
                  type={filter.type}
                  step={filter.step}
                  placeholder={filter.placeholder}
                  value={filterValues[filter.key] || ""}
                  onChange={(event) => onFilterChange?.(filter.key, event.target.value)}
                />
              )}
            </label>
          ))}
          {sortOptions.length ? (
            <label className="flex min-w-[12rem] flex-col gap-1 text-[11px] font-medium text-[var(--text-2)]">
              <span className="flex items-center gap-1"><ArrowDownUp className="h-3 w-3" /> Ordenar por</span>
              <select className="input h-9 min-w-[12rem] py-1 text-xs" value={sortValue} onChange={(event) => onSortChange?.(event.target.value)}>
                {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          ) : null}
          {onClearFilters ? (
            <button className="btn btn-ghost h-9 text-xs" type="button" onClick={onClearFilters}>
              <X className="h-3.5 w-3.5" /> Limpar filtros
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {visibleFields.map((field) => <th key={field.name}>{field.label}</th>)}
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 5 }).map((_, rowIndex) => (
              <tr key={`table-skeleton-${rowIndex}`}>
                {visibleFields.map((field, fieldIndex) => (
                  <td key={field.name}>
                    <Skeleton className={`h-4 ${fieldIndex % 3 === 0 ? "w-28" : fieldIndex % 3 === 1 ? "w-20" : "w-36"}`} />
                  </td>
                ))}
                <td>
                  <div className="flex gap-1.5">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </td>
              </tr>
            )) : rows.length ? rows.map((row) => (
              <tr key={row.id} className={onView ? "cursor-pointer" : ""} onClick={onView ? () => onView(row) : undefined}>
                {visibleFields.map((field) => <td key={field.name}>{renderCell(row, field, lookups)}</td>)}
                <td>
                  <div className="flex gap-1.5">
                    {onView ? (
                      <button className="rounded-md border border-[var(--border)] p-1.5 text-[var(--text-2)] transition-colors hover:bg-[var(--bg)]" onClick={(event) => { event.stopPropagation(); onView(row); }} title="Ver detalhes" type="button">
                        <Eye className="h-4 w-4" />
                      </button>
                    ) : null}
                    {canManage ? (
                      <>
                        <button className="rounded-md border border-[var(--border)] p-1.5 text-[var(--text-2)] transition-colors hover:bg-[var(--bg)]" onClick={(event) => { event.stopPropagation(); onEdit(row); }} title="Editar" type="button">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button className="rounded-md border border-red-200 p-1.5 text-red-500 transition-colors hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40" onClick={(event) => { event.stopPropagation(); onDelete(row.id); }} title="Excluir" type="button">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={visibleFields.length + 1} className="py-12 text-center text-[var(--text-3)]">{emptyMessage}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});
