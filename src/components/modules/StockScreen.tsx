"use client";

import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Filter, PackageOpen, Pencil, Plus, RefreshCw, Scale, Trash2, X } from "lucide-react";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/ui/Badge";
import { ModuleForm } from "@/components/modules/ModuleForm";
import { StatCard } from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/AsyncState";
import { createRecord, deleteRecord, deleteRecords, invalidateRecordsCache, listRecords, updateRecord } from "@/services/crud";
import { notifyDashboardUpdated } from "@/services/dashboard";
import { recordStockMovement, type StockMovementType } from "@/services/stock";
import { TABLES } from "@/lib/tables";
import { useAuth } from "@/lib/auth-context";
import type { AnyRecord, ModuleConfig, RelationOption } from "@/lib/types";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { formatStockQuantity } from "@/lib/stock-format";
import { canManageData, PERMISSION_DENIED_MESSAGE } from "@/lib/permissions";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { withAsyncTimeout } from "@/lib/async";

type StockAction = {
  item: AnyRecord;
  type: StockMovementType;
};

const STOCK_RENDER_BATCH_SIZE = 60;

const actionCopy = {
  entrada: {
    title: "Adicionar ao estoque",
    subtitle: "Use quando chegou uma compra, doação ou reposição.",
    button: "Adicionar quantidade",
    icon: ArrowUpCircle,
    tone: "text-emerald-700"
  },
  saida: {
    title: "Remover do estoque",
    subtitle: "Use quando o item foi usado, vendido, perdido ou descartado.",
    button: "Remover quantidade",
    icon: ArrowDownCircle,
    tone: "text-red-700"
  },
  ajuste: {
    title: "Ajustar saldo",
    subtitle: "Use quando a contagem física está diferente do sistema.",
    button: "Salvar novo saldo",
    icon: Scale,
    tone: "text-blue-700"
  }
};

const stockCategoryLabels: Record<string, string> = {
  racao: "Ração",
  medicamento: "Medicamento",
  insumo: "Insumo",
  equipamento: "Equipamento",
  outro: "Outro"
};

const movementLabels: Record<string, string> = {
  entrada: "entrada",
  saida: "saída",
  ajuste: "ajuste"
};

const STOCK_ITEMS_SELECT = [
  "id",
  "fazenda_id",
  "nome",
  "categoria",
  "unidade_medida",
  "quantidade_atual",
  "quantidade_minima",
  "valor_unitario",
  "fornecedor",
  "ativo",
  "created_at"
].join(",");

const STOCK_MOVEMENTS_SELECT = [
  "id",
  "item_id",
  "tipo",
  "quantidade",
  "valor_unitario",
  "motivo",
  "created_at",
  "origem",
  "source_type",
  "source_id"
].join(",");

function exportStockCsv(rows: AnyRecord[]) {
  const header = ["Produto", "Categoria", "Unidade", "Quantidade atual", "Quantidade mínima", "Valor unitário", "Fornecedor"];
  const body = rows.map((row) => [
    row.nome,
    stockCategoryLabels[String(row.categoria)] || row.categoria,
    row.unidade_medida,
    row.quantidade_atual,
    row.quantidade_minima,
    row.valor_unitario,
    row.fornecedor
  ].map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","));

  const blob = new Blob([`${header.map((item) => `"${item}"`).join(",")}\n${body.join("\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "estoque.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function StockItemSkeleton() {
  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-6 w-14 rounded-full" />
          </div>
          <Skeleton className="mt-3 h-4 w-56 max-w-full" />
        </div>
        <div className="min-w-0 md:w-36">
          <Skeleton className="h-3 w-24 md:ml-auto" />
          <Skeleton className="mt-3 h-8 w-32 md:ml-auto" />
          <Skeleton className="mt-2 h-3 w-28 md:ml-auto" />
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Skeleton className="h-11 rounded-lg" />
        <Skeleton className="h-11 rounded-lg" />
        <Skeleton className="h-11 rounded-lg" />
      </div>
      <div className="mt-4 flex flex-col gap-3 border-t border-[var(--border-light)] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-4 w-56 max-w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>
    </article>
  );
}

function StockActionModal({
  action,
  onClose,
  onSubmit,
  busy
}: {
  action: StockAction;
  onClose: () => void;
  onSubmit: (values: { quantity: number; unitValue?: number; reason?: string }) => Promise<void>;
  busy?: boolean;
}) {
  const [quantity, setQuantity] = useState("");
  const [unitValue, setUnitValue] = useState(action.item.valor_unitario ? String(action.item.valor_unitario) : "");
  const [reason, setReason] = useState("");

  const copy = actionCopy[action.type];
  const Icon = copy.icon;
  const current = Number(action.item.quantidade_atual || 0);
  const typedQuantity = Number(quantity || 0);
  const nextQuantity = action.type === "entrada"
    ? current + typedQuantity
    : action.type === "saida"
      ? Math.max(0, current - typedQuantity)
      : typedQuantity;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({
      quantity: typedQuantity,
      unitValue: unitValue ? Number(unitValue) : undefined,
      reason
    });
  }

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg animate-fade-in rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-lg" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="rounded-lg bg-[var(--bg)] p-3">
              <Icon className={`h-6 w-6 ${copy.tone}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{copy.title}</h2>
              <p className="mt-1 text-sm text-[var(--text-2)]">{copy.subtitle}</p>
            </div>
          </div>
          <button className="rounded-md border border-[var(--border)] p-2" type="button" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 rounded-lg bg-[var(--bg)] p-4 text-sm">
          <p className="font-semibold">{action.item.nome}</p>
          <p className="mt-1 text-[var(--text-2)]">
            Saldo atual: {formatStockQuantity(current, action.item.unidade_medida)}
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium">{action.type === "ajuste" ? "Novo saldo" : "Quantidade"}</span>
            <input className="input" type="number" step="0.001" min="0" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Valor unitário</span>
            <input className="input" type="number" step="0.01" min="0" value={unitValue} onChange={(event) => setUnitValue(event.target.value)} />
          </label>
        </div>

        <label className="mt-4 block space-y-2">
          <span className="text-sm font-medium">Motivo</span>
          <textarea className="input min-h-24 resize-y" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ex: compra de ração, uso no trato, contagem física..." />
        </label>

        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
          <span className="font-medium text-emerald-900 dark:text-emerald-100">Depois da ação: </span>
          {formatStockQuantity(nextQuantity, action.item.unidade_medida)}
        </div>

        <button className="btn btn-primary mt-5 w-full" type="submit" disabled={busy}>
          {busy ? "Salvando..." : copy.button}
        </button>
      </form>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export function StockScreen({ config }: { config: ModuleConfig }) {
  const { dataContext, profile } = useAuth();
  const [items, setItems] = useState<AnyRecord[]>([]);
  const [movements, setMovements] = useState<AnyRecord[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [unitFilter, setUnitFilter] = useState("todos");
  const [sortItems, setSortItems] = useState("attention");
  const [editing, setEditing] = useState<AnyRecord | null>(null);
  const [action, setAction] = useState<StockAction | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [visibleItemLimit, setVisibleItemLimit] = useState(STOCK_RENDER_BATCH_SIZE);
  const formRef = useRef<HTMLDivElement | null>(null);
  const loadRequestRef = useRef(0);
  const deferredSearch = useDeferredValue(search);

  const load = useCallback(async (forceRefresh = false) => {
    const requestId = ++loadRequestRef.current;
    setLoading(true);
    setError("");
    try {
      const [nextItems, nextMovements] = await withAsyncTimeout(Promise.all([
        listRecords(TABLES.estoqueItens, {
          orderBy: "created_at",
          fazendaId: dataContext.fazendaId,
          usuarioId: dataContext.usuarioId,
          select: STOCK_ITEMS_SELECT,
          cache: true,
          forceRefresh
        }),
        listRecords(TABLES.estoqueMovimentacoes, {
          orderBy: "created_at",
          fazendaId: dataContext.fazendaId,
          usuarioId: dataContext.usuarioId,
          select: STOCK_MOVEMENTS_SELECT,
          limit: 1000,
          cache: true,
          forceRefresh
        })
      ]), "O estoque demorou para carregar. Tente novamente.");

      if (loadRequestRef.current !== requestId) return;
      setItems(nextItems);
      setMovements(nextMovements);
    } catch (err) {
      if (loadRequestRef.current === requestId) {
        setError(getFriendlyErrorMessage(err, "Nao foi possivel carregar o estoque agora."));
      }
    } finally {
      if (loadRequestRef.current === requestId) setLoading(false);
    }
  }, [dataContext.fazendaId, dataContext.usuarioId]);

  useEffect(() => {
    void load();
    return () => {
      loadRequestRef.current += 1;
    };
  }, [load]);

  const lastMovementByItem = useMemo(() => {
    const entries = new Map<string, AnyRecord>();
    movements.forEach((movement) => {
      if (movement.item_id && !entries.has(movement.item_id)) entries.set(movement.item_id, movement);
    });
    return entries;
  }, [movements]);

  const categoryOptions = useMemo(
    () => Array.from(new Set(items.map((item) => String(item.categoria || "").trim()).filter(Boolean))).sort(),
    [items]
  );
  const unitOptions = useMemo(
    () => Array.from(new Set(items.map((item) => String(item.unidade_medida || "").trim()).filter(Boolean))).sort(),
    [items]
  );

  const filteredItems = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    const filtered = items.filter((item) => {
      const current = Number(item.quantidade_atual || 0);
      const minimum = Number(item.quantidade_minima || 0);
      const status = current <= 0 ? "zerado" : current <= minimum ? "atencao" : "normal";
      const text = JSON.stringify(item).toLowerCase();

      if (term && !text.includes(term)) return false;
      if (statusFilter !== "todos" && status !== statusFilter) return false;
      if (categoryFilter !== "todos" && String(item.categoria || "") !== categoryFilter) return false;
      if (unitFilter !== "todos" && String(item.unidade_medida || "") !== unitFilter) return false;
      return true;
    });

    return [...filtered].sort((left, right) => {
      const leftCurrent = Number(left.quantidade_atual || 0);
      const rightCurrent = Number(right.quantidade_atual || 0);
      const leftMinimum = Number(left.quantidade_minima || 0);
      const rightMinimum = Number(right.quantidade_minima || 0);
      const leftAttention = leftCurrent <= 0 ? 0 : leftCurrent <= leftMinimum ? 1 : 2;
      const rightAttention = rightCurrent <= 0 ? 0 : rightCurrent <= rightMinimum ? 1 : 2;

      if (sortItems === "attention" && leftAttention !== rightAttention) return leftAttention - rightAttention;
      if (sortItems === "quantity_asc" && leftCurrent !== rightCurrent) return leftCurrent - rightCurrent;
      if (sortItems === "quantity_desc" && leftCurrent !== rightCurrent) return rightCurrent - leftCurrent;
      if (sortItems === "value_desc") {
        const leftValue = leftCurrent * Number(left.valor_unitario || 0);
        const rightValue = rightCurrent * Number(right.valor_unitario || 0);
        if (leftValue !== rightValue) return rightValue - leftValue;
      }
      if (sortItems === "recent") {
        const leftDate = String(lastMovementByItem.get(left.id)?.created_at || left.created_at || "");
        const rightDate = String(lastMovementByItem.get(right.id)?.created_at || right.created_at || "");
        if (leftDate !== rightDate) return rightDate.localeCompare(leftDate);
      }
      return String(left.nome || "").localeCompare(String(right.nome || ""), "pt-BR");
    });
  }, [categoryFilter, deferredSearch, items, lastMovementByItem, sortItems, statusFilter, unitFilter]);

  const visibleItems = useMemo(
    () => filteredItems.slice(0, visibleItemLimit),
    [filteredItems, visibleItemLimit]
  );

  useEffect(() => {
    setVisibleItemLimit(STOCK_RENDER_BATCH_SIZE);
  }, [categoryFilter, deferredSearch, items.length, sortItems, statusFilter, unitFilter]);

  const estimatedValue = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantidade_atual || 0) * Number(item.valor_unitario || 0), 0),
    [items]
  );
  const criticalCount = useMemo(
    () => items.filter((item) => Number(item.quantidade_atual || 0) <= Number(item.quantidade_minima || 0)).length,
    [items]
  );
  const initialLoading = loading && !items.length;
  const initialError = Boolean(error && !items.length && !loading);
  const showPlaceholders = initialLoading;
  const canManage = canManageData(profile);
  const hasActiveFilters = Boolean(
    deferredSearch.trim() || statusFilter !== "todos" || categoryFilter !== "todos" || unitFilter !== "todos"
  );

  function clearFilters() {
    setSearch("");
    setStatusFilter("todos");
    setCategoryFilter("todos");
    setUnitFilter("todos");
    setSortItems("attention");
  }

  function startEditing(item: AnyRecord) {
    setEditing(item);
    window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  async function submitItem(values: AnyRecord) {
    setBusy(true);
    setError("");
    try {
      if (!canManage) throw new Error(PERMISSION_DENIED_MESSAGE);
      if (editing?.id) {
        await updateRecord(TABLES.estoqueItens, editing.id, values, dataContext);
        setEditing(null);
      } else {
        await createRecord(TABLES.estoqueItens, values, dataContext);
      }
      notifyDashboardUpdated();
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o item.");
    } finally {
      setBusy(false);
    }
  }

  async function submitMovement(values: { quantity: number; unitValue?: number; reason?: string }) {
    if (!action) return;
    setBusy(true);
    setError("");
    try {
      if (!canManage) throw new Error(PERMISSION_DENIED_MESSAGE);
      await recordStockMovement({
        item: action.item,
        type: action.type,
        quantity: values.quantity,
        unitValue: values.unitValue,
        reason: values.reason,
        context: dataContext
      });
      invalidateRecordsCache(TABLES.estoqueItens, dataContext);
      invalidateRecordsCache(TABLES.estoqueMovimentacoes, dataContext);
      setAction(null);
      notifyDashboardUpdated();
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível registrar a movimentação.");
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(item: AnyRecord) {
    const ok = window.confirm(`Excluir ${item.nome}? As movimentações desse item também serão removidas.`);
    if (!ok) return;

    setBusy(true);
    setError("");
    try {
      if (!canManage) throw new Error(PERMISSION_DENIED_MESSAGE);
      await deleteRecords(TABLES.estoqueMovimentacoes, [{ column: "item_id", value: item.id }], dataContext);
      await deleteRecord(TABLES.estoqueItens, item.id, dataContext);
      notifyDashboardUpdated();
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Gestão de Estoque</h1>
          <p className="mt-1 text-[13px] text-[var(--text-2)]">
            Controle entradas, retiradas e ajustes de cada produto sem editar o saldo manualmente.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="btn btn-secondary" type="button" onClick={() => exportStockCsv(filteredItems)}>Baixar planilha</button>
          <button className="btn btn-secondary" type="button" onClick={() => load(true)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> {loading ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
      </div>

      {error ? (
        <ErrorState
          title={items.length ? "Nao consegui atualizar o estoque agora." : "Nao consegui carregar o estoque."}
          message={items.length ? "Os ultimos itens carregados continuam visiveis." : error}
          onRetry={() => load(true)}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Itens cadastrados" value={initialError ? "-" : items.length} hint="Produtos e insumos" icon={PackageOpen} tone="green" loading={showPlaceholders} />
        <StatCard title="Estoque crítico" value={initialError ? "-" : criticalCount} hint="Abaixo do mínimo" icon={AlertTriangle} tone={criticalCount ? "red" : "green"} loading={showPlaceholders} />
        <StatCard title="Valor estimado" value={initialError ? "-" : formatCurrency(estimatedValue)} hint="Saldo x valor unitário" icon={Scale} tone="blue" loading={showPlaceholders} />
      </div>

      {canManage ? (
        <div ref={formRef}>
          <ModuleForm config={config} editing={editing} onSubmit={submitItem} onCancel={() => setEditing(null)} busy={busy} relationOptions={{} as Record<string, RelationOption[]>} />
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          Seu perfil pode consultar o estoque, mas não pode criar, editar ou movimentar itens.
        </div>
      )}

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-[15px] font-semibold">Itens do estoque</h2>
            <p className="mt-1 text-sm text-[var(--text-2)]">
              Use os botões de cada item para adicionar, retirar ou ajustar saldo.
            </p>
          </div>
          <input className="input md:max-w-sm" placeholder="Pesquisar item..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>

        <div className="mt-4 rounded-lg border border-[var(--border-light)] bg-[var(--bg)] p-3">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-[var(--text-2)]">
            <Filter className="h-4 w-4 text-pasture" />
            Filtrar e ordenar estoque
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1.5 text-xs font-medium text-[var(--text-2)]">
              <span>Situação</span>
              <select className="input h-10" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="todos">Todos os itens</option>
                <option value="atencao">Abaixo do mínimo</option>
                <option value="zerado">Sem estoque</option>
                <option value="normal">Dentro do mínimo</option>
              </select>
            </label>
            <label className="space-y-1.5 text-xs font-medium text-[var(--text-2)]">
              <span>Categoria</span>
              <select className="input h-10" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="todos">Todas as categorias</option>
                {categoryOptions.map((category) => <option key={category} value={category}>{stockCategoryLabels[category] || category}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-xs font-medium text-[var(--text-2)]">
              <span>Unidade</span>
              <select className="input h-10" value={unitFilter} onChange={(event) => setUnitFilter(event.target.value)}>
                <option value="todos">Todas as unidades</option>
                {unitOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-xs font-medium text-[var(--text-2)]">
              <span>Ordenar por</span>
              <select className="input h-10" value={sortItems} onChange={(event) => setSortItems(event.target.value)}>
                <option value="attention">Atenção primeiro</option>
                <option value="quantity_asc">Menor quantidade</option>
                <option value="quantity_desc">Maior quantidade</option>
                <option value="value_desc">Maior valor em estoque</option>
                <option value="recent">Movimentados recentemente</option>
                <option value="name">Nome (A-Z)</option>
              </select>
            </label>
          </div>
          <div className="mt-3 flex flex-col gap-2 text-xs text-[var(--text-2)] sm:flex-row sm:items-center sm:justify-between">
            <span>{filteredItems.length} {filteredItems.length === 1 ? "item encontrado" : "itens encontrados"}</span>
            {hasActiveFilters ? <button type="button" onClick={clearFilters} className="font-semibold text-pasture hover:underline sm:text-right">Limpar filtros</button> : null}
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {showPlaceholders ? Array.from({ length: 4 }).map((_, index) => <StockItemSkeleton key={`stock-skeleton-${index}`} />) : filteredItems.length ? visibleItems.map((item) => {
            const current = Number(item.quantidade_atual || 0);
            const minimum = Number(item.quantidade_minima || 0);
            const critical = current <= minimum;
            const recentMovement = lastMovementByItem.get(item.id);

            return (
              <article key={item.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-[var(--text-3)]">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[15px] font-semibold">{item.nome}</h3>
                      <Badge tone={critical ? "danger" : "success"}>{critical ? "Atenção" : "Ok"}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-[var(--text-2)]">
                      {stockCategoryLabels[String(item.categoria)] || item.categoria || "Sem categoria"} • {item.fornecedor || "Sem fornecedor"}
                    </p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--text-3)]">Saldo atual</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums">{formatStockQuantity(current, item.unidade_medida)}</p>
                    <p className="text-xs text-[var(--text-2)]">Mínimo: {formatStockQuantity(minimum, item.unidade_medida)}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <button className="btn bg-emerald-600 text-white disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={() => setAction({ item, type: "entrada" })} disabled={!canManage}>
                    <Plus className="h-4 w-4" /> Adicionar
                  </button>
                  <button className="btn border border-red-200 bg-red-50 text-red-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200" type="button" onClick={() => setAction({ item, type: "saida" })} disabled={!canManage}>
                    <ArrowDownCircle className="h-4 w-4" /> Remover
                  </button>
                  <button className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={() => setAction({ item, type: "ajuste" })} disabled={!canManage}>
                    <Scale className="h-4 w-4" /> Ajustar
                  </button>
                </div>

                <div className="mt-4 flex flex-col gap-3 border-t border-[var(--border-light)] pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-[var(--text-2)]">
                    {recentMovement ? (
                      <span>Última movimentação: {movementLabels[String(recentMovement.tipo)] || recentMovement.tipo} em {formatDate(recentMovement.created_at)}</span>
                    ) : (
                      <span>Nenhuma movimentação registrada ainda.</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {canManage ? (
                      <>
                        <button className="rounded-md border border-[var(--border)] p-2 hover:bg-[var(--bg)]" type="button" onClick={() => startEditing(item)} title="Editar item">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button className="rounded-md border border-red-200 p-2 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40" type="button" onClick={() => removeItem(item)} title="Excluir item">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          }) : (
            <EmptyState
              className="xl:col-span-2"
              title={hasActiveFilters ? "Nenhum item encontrado com esses filtros." : "Voce ainda nao cadastrou itens no estoque."}
              message={hasActiveFilters ? "Limpe os filtros ou ajuste a busca para ver mais resultados." : "Cadastre o primeiro item para acompanhar saldo, entradas, saidas e estoque minimo."}
            />
          )}
        </div>
        {!showPlaceholders && filteredItems.length > visibleItemLimit ? (
          <div className="mt-5 flex justify-center">
            <button className="btn btn-secondary" type="button" onClick={() => setVisibleItemLimit((current) => current + STOCK_RENDER_BATCH_SIZE)}>
              Mostrar mais itens
            </button>
          </div>
        ) : null}
      </section>

      {action ? <StockActionModal action={action} onClose={() => setAction(null)} onSubmit={submitMovement} busy={busy} /> : null}
    </div>
  );
}
