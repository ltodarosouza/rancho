"use client";

import dynamic from "next/dynamic";
import {
  Activity,
  ClipboardList,
  Clock3,
  Database,
  Droplets,
  Layers3,
  PackageOpen,
  PawPrint,
  Plus,
  Receipt,
  RefreshCw,
  Users,
  Wallet,
  type LucideIcon
} from "lucide-react";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DataTable, type DataTableFilter } from "@/components/ui/DataTable";
import { AnimalCards } from "@/components/modules/AnimalCards";
import { ModuleForm } from "@/components/modules/ModuleForm";
import { StatCard } from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/AsyncState";
import { createRecord, deleteRecord, deleteRecords, invalidateRecordsCache, listRecords, loadRelationOptions, subscribeTable, updateRecord } from "@/services/crud";
import { syncAnimalPhaseAfterEvent } from "@/services/animal-lifecycle";
import { notifyDashboardUpdated } from "@/services/dashboard";
import { removeEventCostFromFinance, syncEventCostToFinance } from "@/services/event-finance";
import { removeProductionStockMovement, syncProductionStockMovement, validateProductionStockDestination } from "@/services/production-stock";
import { useAuth } from "@/lib/auth-context";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { TABLES } from "@/lib/tables";
import type { AnyRecord, ModuleConfig, RelationOption } from "@/lib/types";
import { financialAmount, isFinancialExpense, isFinancialIncome } from "@/lib/finance";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { withAsyncTimeout } from "@/lib/async";
import { animalBlockedMessage, isAnimalInactiveForBot } from "@/lib/whatsapp/animal-status";
import { canManageData, PERMISSION_DENIED_MESSAGE } from "@/lib/permissions";

const AnimalDetailModal = dynamic(
  () => import("@/components/modules/AnimalDetailModal").then((module) => module.AnimalDetailModal),
  { ssr: false }
);

const moduleIcons: Record<string, LucideIcon> = {
  Layers3,
  PawPrint,
  ClipboardList,
  Droplets,
  PackageOpen,
  Wallet,
  Users,
  Clock3,
  Receipt
};

const MODULE_PAGE_SIZE = 50;

const pagedModuleTables = new Set<string>([
  TABLES.eventosAnimal,
  TABLES.ordenhas,
  TABLES.transacoesFinanceiras,
  TABLES.registrosPonto,
  TABLES.folhaPagamento
]);

const moduleExtraColumns: Record<string, string[]> = {
  [TABLES.animais]: [
    "sexo",
    "fase",
    "status",
    "lote_id",
    "brinco",
    "nome",
    "categoria",
    "raca",
    "peso",
    "data_nascimento",
    "observacoes"
  ],
  [TABLES.transacoesFinanceiras]: [
    "tipo",
    "valor",
    "categoria",
    "descricao",
    "data_transacao",
    "created_at",
    "metodo_pagamento",
    "origem"
  ],
  [TABLES.ordenhas]: ["animal_id", "litros", "turno", "ordenhado_em", "destino", "estoque_item_id", "observacoes"],
  [TABLES.eventosAnimal]: ["animal_id", "tipo", "data_evento", "descricao", "medicamento", "dose", "custo"],
  [TABLES.registrosPonto]: ["funcionario_id", "tipo", "registrado_em", "observacao"],
  [TABLES.folhaPagamento]: [
    "funcionario_id",
    "competencia",
    "salario_base",
    "horas_extras",
    "valor_horas_extras",
    "descontos",
    "adiantamentos",
    "total_liquido",
    "status",
    "pago_em"
  ]
};

const moduleEmptyMessages: Record<string, string> = {
  lotes: "Voce ainda nao cadastrou lotes.",
  eventos: "Nao ha eventos registrados neste periodo.",
  producao: "Nao ha registros de producao por enquanto.",
  financeiro: "Nao ha transacoes registradas neste periodo.",
  ponto: "Nao ha registros de ponto neste periodo.",
  folha: "Nao ha folhas de pagamento cadastradas."
};

function uniqueColumns(columns: Array<string | undefined | null>) {
  return Array.from(new Set(columns.filter(Boolean) as string[]));
}

function moduleListSelect(config: ModuleConfig) {
  const columns = uniqueColumns([
    "id",
    "created_at",
    "fazenda_id",
    config.primaryColumn,
    config.descriptionColumn,
    config.orderBy,
    ...config.fields.filter((field) => !field.formOnly).map((field) => field.name),
    ...(config.quickStats || []).flatMap((stat) => [stat.field, stat.compareField]),
    ...(moduleExtraColumns[config.tableName] || [])
  ]);

  return columns.join(",");
}

function modulePageSize(tableName: string) {
  return pagedModuleTables.has(tableName) ? MODULE_PAGE_SIZE : undefined;
}

function calcStat(rows: AnyRecord[], stat: NonNullable<ModuleConfig["quickStats"]>[number]) {
  if (stat.mode === "count") return rows.length;
  if (stat.mode === "active") return rows.filter((row) => row[stat.field] === true || row[stat.field] === "ativo").length;
  if (stat.mode === "critical") return rows.filter((row) => Number(row[stat.field] || 0) <= Number(row[stat.compareField || "quantidade_minima"] || 0)).length;
  if (stat.mode === "moneyIn") return formatCurrency(rows.filter(isFinancialIncome).reduce((sum, row) => sum + financialAmount(row, stat.field), 0));
  if (stat.mode === "moneyOut") return formatCurrency(rows.filter(isFinancialExpense).reduce((sum, row) => sum + financialAmount(row, stat.field), 0));

  const sum = rows.reduce((total, row) => total + Number(row[stat.field] || 0), 0);
  if (stat.mode === "avg") return formatNumber(rows.length ? sum / rows.length : 0, stat.suffix || "");
  if (["salario_base", "valor", "total_liquido", "custo"].includes(stat.field)) return formatCurrency(sum);
  return formatNumber(sum, stat.suffix || "");
}

type ModuleTableControls = {
  filters: DataTableFilter[];
  sortOptions: Array<{ label: string; value: string }>;
};

function moduleTableControls(key: string): ModuleTableControls {
  if (key === "producao") {
    return {
      filters: [
        { key: "litros_min", label: "Litros mínimos", type: "number", placeholder: "Ex.: 10", step: "0.1" },
        { key: "litros_max", label: "Litros máximos", type: "number", placeholder: "Ex.: 40", step: "0.1" }
      ],
      sortOptions: [
        { label: "Data: mais recentes", value: "default" },
        { label: "Data: mais antigas", value: "data_asc" },
        { label: "Litros: maior para menor", value: "litros_desc" },
        { label: "Litros: menor para maior", value: "litros_asc" }
      ]
    };
  }

  if (key === "eventos") {
    return {
      filters: [
        {
          key: "tipo",
          label: "Tipo de evento",
          type: "select",
          options: [
            { label: "Todos", value: "" },
            { label: "Parto", value: "parto" },
            { label: "Vacina", value: "vacina" },
            { label: "Doença", value: "doenca" },
            { label: "Tratamento", value: "tratamento" },
            { label: "Inseminação", value: "inseminacao" },
            { label: "Pesagem", value: "pesagem" },
            { label: "Observação", value: "observacao" },
            { label: "Outro", value: "outro" }
          ]
        },
        { key: "data_de", label: "A partir de", type: "date" },
        { key: "data_ate", label: "Até", type: "date" },
        { key: "custo_min", label: "Custo mínimo", type: "number", placeholder: "Ex.: 100", step: "0.01" }
      ],
      sortOptions: [
        { label: "Data: mais recentes", value: "default" },
        { label: "Data: mais antigas", value: "data_asc" },
        { label: "Custo: maior para menor", value: "custo_desc" },
        { label: "Custo: menor para maior", value: "custo_asc" }
      ]
    };
  }

  if (key === "lotes") {
    return {
      filters: [
        {
          key: "ativo",
          label: "Status",
          type: "select",
          options: [
            { label: "Todos", value: "" },
            { label: "Ativos", value: "true" },
            { label: "Inativos", value: "false" }
          ]
        }
      ],
      sortOptions: [
        { label: "Mais recentes", value: "default" },
        { label: "Mais antigos", value: "created_asc" },
        { label: "Nome: A-Z", value: "nome_asc" },
        { label: "Nome: Z-A", value: "nome_desc" }
      ]
    };
  }

  if (key === "financeiro") {
    return {
      filters: [
        {
          key: "tipo",
          label: "Movimento",
          type: "select",
          options: [
            { label: "Entradas e saídas", value: "" },
            { label: "Entradas", value: "entrada" },
            { label: "Saídas", value: "saida" }
          ]
        },
        { key: "data_de", label: "A partir de", type: "date" },
        { key: "data_ate", label: "Até", type: "date" },
        { key: "valor_min", label: "Valor mínimo", type: "number", placeholder: "Ex.: 500", step: "0.01" }
      ],
      sortOptions: [
        { label: "Data: mais recentes", value: "default" },
        { label: "Data: mais antigas", value: "data_asc" },
        { label: "Valor: maior para menor", value: "valor_desc" },
        { label: "Valor: menor para maior", value: "valor_asc" }
      ]
    };
  }

  return { filters: [], sortOptions: [] };
}

function rowDateValue(row: AnyRecord, key: string) {
  return String(row[key] || "").slice(0, 10);
}

function sortTableRows(rows: AnyRecord[], key: string, sortValue: string) {
  if (!sortValue || sortValue === "default") return rows;
  const direction = sortValue.endsWith("_asc") ? 1 : -1;
  const field = sortValue.replace(/_(?:asc|desc)$/, "");
  return [...rows].sort((left, right) => {
    const leftValue = ["litros", "custo", "valor"].includes(field)
      ? Number(left[field] || 0)
      : field === "data" ? rowDateValue(left, "data_evento") : left[field] || "";
    const rightValue = ["litros", "custo", "valor"].includes(field)
      ? Number(right[field] || 0)
      : field === "data" ? rowDateValue(right, "data_evento") : right[field] || "";
    if (typeof leftValue === "number" && typeof rightValue === "number") return (leftValue - rightValue) * direction;
    return String(leftValue).localeCompare(String(rightValue), "pt-BR", { numeric: true }) * direction;
  });
}

function filterAndSortModuleRows(rows: AnyRecord[], key: string, search: string, filterValues: Record<string, string>, sortValue: string) {
  const term = search.trim().toLowerCase();
  let filtered = rows.filter((row) => {
    if (term && !JSON.stringify(row).toLowerCase().includes(term)) return false;
    if (key === "producao") {
      const liters = Number(row.litros || 0);
      if (filterValues.litros_min && liters < Number(filterValues.litros_min)) return false;
      if (filterValues.litros_max && liters > Number(filterValues.litros_max)) return false;
    }
    if (key === "eventos") {
      if (filterValues.tipo && String(row.tipo || "") !== filterValues.tipo) return false;
      const date = rowDateValue(row, "data_evento");
      if (filterValues.data_de && date < filterValues.data_de) return false;
      if (filterValues.data_ate && date > filterValues.data_ate) return false;
      if (filterValues.custo_min && Number(row.custo || 0) < Number(filterValues.custo_min)) return false;
    }
    if (key === "lotes" && filterValues.ativo && String(Boolean(row.ativo)) !== filterValues.ativo) return false;
    if (key === "financeiro") {
      if (filterValues.tipo && String(row.tipo || "") !== filterValues.tipo) return false;
      const date = rowDateValue(row, "data_transacao");
      if (filterValues.data_de && date < filterValues.data_de) return false;
      if (filterValues.data_ate && date > filterValues.data_ate) return false;
      if (filterValues.valor_min && Number(row.valor || 0) < Number(filterValues.valor_min)) return false;
    }
    return true;
  });

  if (key === "producao" && (sortValue === "litros_desc" || sortValue === "litros_asc")) return sortTableRows(filtered, key, sortValue);
  if (key === "eventos" && (sortValue === "custo_desc" || sortValue === "custo_asc")) return sortTableRows(filtered, key, sortValue);
  if (key === "financeiro" && (sortValue === "valor_desc" || sortValue === "valor_asc")) return sortTableRows(filtered, key, sortValue);
  if (key === "lotes" && (sortValue === "nome_asc" || sortValue === "nome_desc")) return sortTableRows(filtered, key, sortValue);
  if (sortValue === "data_asc") {
    const dateField = key === "producao" ? "ordenhado_em" : key === "financeiro" ? "data_transacao" : key === "eventos" ? "data_evento" : "created_at";
    return [...filtered].sort((left, right) => rowDateValue(left, dateField).localeCompare(rowDateValue(right, dateField)));
  }
  if (sortValue === "created_asc") return [...filtered].sort((left, right) => rowDateValue(left, "created_at").localeCompare(rowDateValue(right, "created_at")));
  return filtered;
}

function exportCsv(filename: string, rows: AnyRecord[], fields: ModuleConfig["fields"]) {
  const visible = fields.filter((field) => field.tableVisible !== false);
  const header = visible.map((field) => `"${field.label}"`).join(",");
  const body = rows.map((row) => visible.map((field) => `"${String(row[field.name] ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function persistedFormValues(config: ModuleConfig, values: AnyRecord) {
  return config.fields.reduce<AnyRecord>((acc, field) => {
    if (!field.formOnly) acc[field.name] = values[field.name];
    return acc;
  }, {});
}

export function ModuleScreen({ config }: { config: ModuleConfig }) {
  const { dataContext, profile, session } = useAuth();
  const farmId = dataContext.fazendaId;
  const userId = dataContext.usuarioId;
  const queryContext = useMemo(() => ({ fazendaId: farmId, usuarioId: userId }), [farmId, userId]);
  const [rows, setRows] = useState<AnyRecord[]>([]);
  const [allRows, setAllRows] = useState<AnyRecord[]>([]);
  const [relationOptions, setRelationOptions] = useState<Record<string, RelationOption[]>>({});
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AnyRecord | null>(null);
  const [selectedAnimal, setSelectedAnimal] = useState<AnyRecord | null>(null);
  const [animalDeleteTarget, setAnimalDeleteTarget] = useState<AnyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [visibleLimit, setVisibleLimit] = useState<number | undefined>(() => modulePageSize(config.tableName));
  const [hasMoreRows, setHasMoreRows] = useState(false);
  const formRef = useRef<HTMLDivElement | null>(null);
  const loadRequestRef = useRef(0);
  const deferredSearch = useDeferredValue(search);
  const [tableFilterValues, setTableFilterValues] = useState<Record<string, string>>({});
  const [tableSort, setTableSort] = useState("default");

  const Icon = moduleIcons[config.icon] || Database;
  const initialLoading = loading && !rows.length;
  const initialError = Boolean(error && !rows.length && !loading);
  const showPlaceholders = initialLoading;
  const canManage = canManageData(profile);
  const selectColumns = useMemo(() => moduleListSelect(config), [config]);
  const pageSize = useMemo(() => modulePageSize(config.tableName), [config.tableName]);
  const tableControls = useMemo(() => moduleTableControls(config.key), [config.key]);
  const emptyMessage = initialError
    ? `Nao consegui carregar os registros de ${config.title.toLowerCase()} agora.`
    : deferredSearch.trim()
      ? "Nenhum registro encontrado para esta busca."
      : moduleEmptyMessages[config.key] || "Nenhum registro cadastrado ainda.";

  const load = useCallback(async (forceRefresh = false) => {
    const requestId = ++loadRequestRef.current;
    setLoading(true);
    setError("");
    try {
      const relationFields = config.fields.filter((field) => field.type === "relation" && field.relation);
      const listOptions = {
        orderBy: config.orderBy,
        fazendaId: queryContext.fazendaId,
        usuarioId: queryContext.usuarioId,
        select: selectColumns,
        cache: true,
        forceRefresh
      };
      const pageDataPromise = listRecords(config.tableName, {
        ...listOptions,
        limit: visibleLimit
      });
      const completeDataPromise = pageSize
        ? (async () => {
          const completeRows: AnyRecord[] = [];
          const chunkSize = 1000;
          let offset = 0;
          while (true) {
            const chunk = await listRecords(config.tableName, {
              ...listOptions,
              limit: chunkSize,
              offset
            });
            completeRows.push(...chunk);
            if (chunk.length < chunkSize) return completeRows;
            offset += chunk.length;
          }
        })()
        : pageDataPromise;
      const [data, completeData, relationPairs] = await withAsyncTimeout(Promise.all([
        pageDataPromise,
        completeDataPromise,
        Promise.all(relationFields.map(async (field) => [field.name, await loadRelationOptions(field, queryContext)] as const))
      ]), `A tela de ${config.title} demorou para carregar. Tente novamente.`);
      if (loadRequestRef.current !== requestId) return;
      setRows(data);
      setAllRows(completeData);
      setHasMoreRows(Boolean(pageSize && visibleLimit && data.length >= visibleLimit));
      setSelectedAnimal((current) => current ? data.find((row) => String(row.id) === String(current.id)) || current : current);
      setRelationOptions(Object.fromEntries(relationPairs));
    } catch (err) {
      if (loadRequestRef.current === requestId) {
        setError(getFriendlyErrorMessage(err, "Nao foi possivel carregar os dados agora."));
      }
    } finally {
      if (loadRequestRef.current === requestId) setLoading(false);
    }
  }, [config.fields, config.orderBy, config.tableName, config.title, pageSize, queryContext, selectColumns, visibleLimit]);

  useEffect(() => {
    void load();
    const unsubscribe = subscribeTable(config.tableName, () => { void load(true); });
    return () => {
      loadRequestRef.current += 1;
      unsubscribe();
    };
  }, [config.tableName, load]);

  useEffect(() => {
    setVisibleLimit(modulePageSize(config.tableName));
    setHasMoreRows(false);
    setTableFilterValues({});
    setTableSort("default");
  }, [config.tableName]);

  const hasTableFilters = useMemo(
    () => Object.values(tableFilterValues).some((value) => Boolean(value)),
    [tableFilterValues]
  );

  const allFilteredRows = useMemo(
    () => filterAndSortModuleRows(allRows, config.key, deferredSearch, tableFilterValues, tableSort),
    [allRows, config.key, deferredSearch, tableFilterValues, tableSort]
  );

  const shouldUseCompleteRows = Boolean(deferredSearch.trim() || hasTableFilters || tableSort !== "default");
  const filteredRows = useMemo(
    () => shouldUseCompleteRows
      ? allFilteredRows
      : filterAndSortModuleRows(rows, config.key, "", {}, "default"),
    [allFilteredRows, config.key, rows, shouldUseCompleteRows]
  );

  const statRows = allFilteredRows;

  const denyManage = useCallback(() => setError(PERMISSION_DENIED_MESSAGE), []);
  const exportFilteredRows = useCallback(() => exportCsv(config.key, allFilteredRows, config.fields), [allFilteredRows, config.fields, config.key]);
  const exportAnimals = useCallback((animals: AnyRecord[]) => exportCsv(config.key, animals, config.fields), [config.fields, config.key]);

  const updateTableFilter = useCallback((key: string, value: string) => {
    setTableFilterValues((current) => ({ ...current, [key]: value }));
  }, []);

  const clearTableFilters = useCallback(() => {
    setSearch("");
    setTableFilterValues({});
    setTableSort("default");
  }, [setSearch]);

  async function assertAnimalCanReceiveRecord(values: AnyRecord) {
    const isAnimalRecord = config.tableName === TABLES.ordenhas || config.tableName === TABLES.eventosAnimal;
    if (!isAnimalRecord || !values.animal_id) return;
    const [animal] = await listRecords(TABLES.animais, {
      fazendaId: dataContext.fazendaId,
      usuarioId: dataContext.usuarioId,
      select: "id,status,brinco,nome,died_at,death_date,data_morte",
      filters: [{ column: "id", value: values.animal_id }],
      cache: true
    });

    if (animal && isAnimalInactiveForBot(animal)) {
      throw new Error(animalBlockedMessage(animal, config.tableName === TABLES.ordenhas ? "PRODUCAO_LEITE" : "novas movimentações"));
    }
  }

  const openEditor = useCallback((row: AnyRecord) => {
    setEditing(row);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  async function submit(values: AnyRecord) {
    setBusy(true);
    setError("");
    try {
      if (!canManage) throw new Error(PERMISSION_DENIED_MESSAGE);
      await assertAnimalCanReceiveRecord(values);
      if (config.tableName === TABLES.ordenhas) {
        await validateProductionStockDestination(values, dataContext);
      }

      const payload = persistedFormValues(config, values);
      if (config.tableName === TABLES.ordenhas) {
        delete payload.estoque_item_id;
        if (values.adicionar_ao_estoque) {
          payload.estoque_item_id = values.estoque_item_id || null;
        } else if (editing?.estoque_item_id) {
          payload.estoque_item_id = null;
        }
      }

      if (editing?.id) {
        const updated = await updateRecord(config.tableName, editing.id, payload, dataContext);
        if (config.tableName === TABLES.eventosAnimal) {
          const eventRecord = updated || { ...editing, ...payload };
          await syncEventCostToFinance(eventRecord, dataContext, relationOptions.animal_id);
          await syncAnimalPhaseAfterEvent(eventRecord, dataContext);
        }
        if (config.tableName === TABLES.ordenhas) {
          await syncProductionStockMovement(updated || { ...editing, ...payload, id: editing.id }, dataContext);
        }
        setEditing(null);
      } else {
        const created = await createRecord(config.tableName, payload, dataContext);
        if (config.tableName === TABLES.eventosAnimal) {
          const eventRecord = created || payload;
          await syncEventCostToFinance(eventRecord, dataContext, relationOptions.animal_id);
          await syncAnimalPhaseAfterEvent(eventRecord, dataContext);
        }
        if (config.tableName === TABLES.ordenhas) {
          await syncProductionStockMovement(created || payload, dataContext);
        }
      }
      notifyDashboardUpdated();
      await load(true);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, "Não foi possível salvar o registro agora."));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (config.tableName === TABLES.animais) {
      const animal = rows.find((row) => String(row.id) === String(id));
      if (animal) {
        setAnimalDeleteTarget(animal);
        return;
      }
    }

    const ok = window.confirm("Tem certeza que deseja excluir este registro?");
    if (!ok) return;
    setBusy(true);
    try {
      if (!canManage) throw new Error(PERMISSION_DENIED_MESSAGE);
      const deletedRow = rows.find((row) => String(row.id) === String(id));
      if (config.tableName === TABLES.ordenhas) {
        if (session?.access_token) {
          const response = await fetch("/api/production/delete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ productionId: id })
          });
          const result = await response.json().catch(() => ({}));
          invalidateRecordsCache(config.tableName, dataContext);
          invalidateRecordsCache(TABLES.estoqueMovimentacoes, dataContext);
          if (!response.ok || result?.ok === false) {
            throw new Error(result?.error || "Não foi possível excluir o registro de produção agora.");
          }
        } else {
          await removeProductionStockMovement(id, dataContext);
          await deleteRecord(config.tableName, id, dataContext);
        }
      } else {
        await deleteRecord(config.tableName, id, dataContext);
      }
      if (config.tableName === TABLES.eventosAnimal && deletedRow) {
        await removeEventCostFromFinance(id, dataContext);
      }
      notifyDashboardUpdated();
      await load(true);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, "Não foi possível excluir o registro agora."));
    } finally {
      setBusy(false);
    }
  }

  async function inactivateAnimal() {
    if (!animalDeleteTarget?.id) return;
    setBusy(true);
    setError("");
    try {
      if (!canManage) throw new Error(PERMISSION_DENIED_MESSAGE);
      await updateRecord(TABLES.animais, animalDeleteTarget.id, { status: "inativo" }, dataContext);
      setAnimalDeleteTarget(null);
      notifyDashboardUpdated();
      await load(true);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, "Não foi possível inativar o animal agora."));
    } finally {
      setBusy(false);
    }
  }

  async function deleteAnimalAndLinks() {
    if (!animalDeleteTarget?.id) return;
    const animalId = String(animalDeleteTarget.id);
    setBusy(true);
    setError("");

    try {
      if (!canManage) throw new Error(PERMISSION_DENIED_MESSAGE);

      if (session?.access_token) {
        const response = await fetch("/api/animals/delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ animalId })
        });
        const result = await response.json().catch(() => ({}));
        [
          TABLES.animais,
          TABLES.ordenhas,
          TABLES.eventosAnimal,
          TABLES.transacoesFinanceiras,
          TABLES.estoqueMovimentacoes,
          TABLES.alertas,
          TABLES.notificacoes
        ].forEach((tableName) => invalidateRecordsCache(tableName, dataContext));
        if (!response.ok || result?.ok === false) {
          throw new Error(result?.error || "Não foi possível excluir o animal agora.");
        }
      } else {
        const [animalEvents, childrenByMother, childrenByFather] = await Promise.all([
          listRecords(TABLES.eventosAnimal, {
            fazendaId: dataContext.fazendaId,
            usuarioId: dataContext.usuarioId,
            select: "id",
            filters: [{ column: "animal_id", value: animalId }]
          }),
          listRecords(TABLES.animais, {
            fazendaId: dataContext.fazendaId,
            usuarioId: dataContext.usuarioId,
            select: "id,mae_id,pai_id",
            filters: [{ column: "mae_id", value: animalId }]
          }),
          listRecords(TABLES.animais, {
            fazendaId: dataContext.fazendaId,
            usuarioId: dataContext.usuarioId,
            select: "id,mae_id,pai_id",
            filters: [{ column: "pai_id", value: animalId }]
          })
        ]);

        await Promise.all(animalEvents.map((event) => event.id ? removeEventCostFromFinance(String(event.id), dataContext) : Promise.resolve()));
        await deleteRecords(TABLES.ordenhas, [{ column: "animal_id", value: animalId }], dataContext);
        await deleteRecords(TABLES.eventosAnimal, [{ column: "animal_id", value: animalId }], dataContext);

        const children = Array.from(new Map([...childrenByMother, ...childrenByFather].map((child) => [String(child.id), child])).values());
        await Promise.all(children.map((child) => updateRecord(TABLES.animais, child.id, {
          ...(String(child.mae_id || "") === animalId ? { mae_id: null } : {}),
          ...(String(child.pai_id || "") === animalId ? { pai_id: null } : {})
        }, dataContext)));

        await deleteRecord(TABLES.animais, animalId, dataContext);
      }

      setAnimalDeleteTarget(null);
      if (selectedAnimal?.id === animalId) setSelectedAnimal(null);
      notifyDashboardUpdated();
      await load(true);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, "Não foi possível excluir o animal agora."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{config.title}</h1>
          <p className="mt-1 text-[13px] text-[var(--text-2)]">{config.subtitle}</p>
        </div>
        <button className="btn btn-secondary text-[13px]" type="button" onClick={() => load(true)} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> {loading ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      {error ? (
        <ErrorState
          title={rows.length ? "Nao consegui atualizar agora." : "Nao consegui carregar esta tela."}
          message={rows.length ? "Os ultimos dados carregados continuam visiveis." : error}
          onRetry={() => load(true)}
        />
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {(config.quickStats || []).map((stat, index) => (
          <StatCard key={stat.label} title={stat.label} value={initialError ? "-" : calcStat(statRows, stat)} icon={index % 2 ? Activity : Icon} tone={index % 2 ? "blue" : "green"} loading={showPlaceholders} />
        ))}
      </div>

      <div className="space-y-5">
        {canManage ? (
          <div ref={formRef} className="scroll-mt-16">
            <ModuleForm config={config} editing={editing} onSubmit={submit} onCancel={() => setEditing(null)} busy={busy} relationOptions={relationOptions} />
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[13px] font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            Seu perfil pode consultar esta área, mas não pode criar, editar ou excluir registros.
          </div>
        )}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">{config.key === "rebanho" ? "Animais do rebanho" : "Registros"}</h2>
            <span className="text-xs font-medium text-[var(--text-2)]">
              {showPlaceholders ? <Skeleton className="h-4 w-20" /> : initialError ? "-" : config.key === "rebanho" ? `${allRows.length} animais` : `${shouldUseCompleteRows ? filteredRows.length : allRows.length} itens`}
            </span>
          </div>
          {config.key === "rebanho" ? (
            <AnimalCards
              rows={rows}
              search={search}
              setSearch={setSearch}
              relationOptions={relationOptions}
              loading={showPlaceholders}
              onDelete={remove}
              onEdit={canManage ? openEditor : denyManage}
              onView={setSelectedAnimal}
              onExport={exportAnimals}
              canManage={canManage}
            />
          ) : (
            <DataTable
              rows={filteredRows}
              fields={config.fields}
              search={search}
              setSearch={setSearch}
              onDelete={remove}
              onEdit={canManage ? openEditor : denyManage}
              onExport={exportFilteredRows}
              relationOptions={relationOptions}
              loading={showPlaceholders}
              canManage={canManage}
              emptyMessage={emptyMessage}
              filters={tableControls.filters}
              filterValues={tableFilterValues}
              onFilterChange={updateTableFilter}
              sortOptions={tableControls.sortOptions}
              sortValue={tableSort}
              onSortChange={setTableSort}
              onClearFilters={clearTableFilters}
            />
          )}
          {pageSize && hasMoreRows && !shouldUseCompleteRows ? (
            <div className="flex justify-center">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setVisibleLimit((current) => (current || pageSize) + pageSize)}
              >
                Carregar mais registros
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {selectedAnimal && typeof document !== "undefined" ? createPortal(
        <AnimalDetailModal
          animal={selectedAnimal}
          context={dataContext}
          relationOptions={relationOptions}
          onClose={() => setSelectedAnimal(null)}
          onChanged={() => load(true)}
        />,
        document.body
      ) : null}

      {animalDeleteTarget && typeof document !== "undefined" ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <section className="w-full max-w-lg rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl">
            <h2 className="text-lg font-semibold">Excluir animal?</h2>
            <p className="mt-3 text-sm text-[var(--text-2)]">
              Ao confirmar, {animalDeleteTarget.nome || animalDeleteTarget.brinco || "este animal"} será excluído do rebanho e os vínculos de produção, eventos e genealogia relacionados também serão removidos ou atualizados.
            </p>
            <p className="mt-2 text-sm text-[var(--text-3)]">
              Se quiser preservar o histórico sem usar mais esse animal nos lançamentos, escolha apenas inativar.
            </p>

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button className="btn btn-secondary" type="button" onClick={() => setAnimalDeleteTarget(null)} disabled={busy}>
                Cancelar
              </button>
              <button className="btn btn-secondary" type="button" onClick={inactivateAnimal} disabled={busy}>
                Só inativar
              </button>
              <button className="btn bg-red-600 text-white hover:bg-red-700" type="button" onClick={deleteAnimalAndLinks} disabled={busy}>
                {busy ? "Processando..." : "Excluir animal e vínculos"}
              </button>
            </div>
          </section>
        </div>,
        document.body
      ) : null}
    </div>
  );
}
