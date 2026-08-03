import { TABLES } from "@/lib/tables";
import type { AnyRecord } from "@/lib/types";
import type { DemoStore } from "@/lib/marketing/demo-store";
import type { BotSession } from "@/services/whatsapp/session-service";
import type { WhatsAppOwner } from "@/services/whatsapp/identity";

type DemoTable = string;
type Filter = { kind: string; column: string; value?: unknown; values?: unknown[] };
type DemoRow = AnyRecord & { __index?: number; __key?: string };

type DemoContext = {
  store: DemoStore;
  phone: string;
  session: BotSession;
};

type DemoQuery = {
  select: (columns?: string) => DemoQuery;
  eq: (column: string, value: unknown) => DemoQuery;
  neq: (column: string, value: unknown) => DemoQuery;
  in: (column: string, values: unknown[]) => DemoQuery;
  gte: (column: string, value: unknown) => DemoQuery;
  lte: (column: string, value: unknown) => DemoQuery;
  lt: (column: string, value: unknown) => DemoQuery;
  gt: (column: string, value: unknown) => DemoQuery;
  is: (column: string, value: unknown) => DemoQuery;
  order: (column: string, options?: { ascending?: boolean }) => DemoQuery;
  limit: (value: number) => DemoQuery;
  range: (from: number, to: number) => DemoQuery;
  insert: (payload: AnyRecord | AnyRecord[]) => DemoQuery;
  upsert: (payload: AnyRecord | AnyRecord[], options?: AnyRecord) => DemoQuery;
  update: (payload: AnyRecord) => DemoQuery;
  delete: () => DemoQuery;
  single: () => DemoQuery;
  maybeSingle: () => DemoQuery;
  then: <T>(resolve: (value: { data: AnyRecord | AnyRecord[] | null; error: AnyRecord | null }) => T) => Promise<T>;
};

function normalize(value: unknown) {
  return String(value ?? "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function comparable(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function dateValue(value: unknown) {
  const text = String(value ?? "");
  if (!text || text === "Hoje") return new Date().toISOString();
  if (text === "Ontem") {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString();
  }
  const brazilian = text.match(/^(\d{2})\/(\d{2})(?:\/(\d{4}))?$/);
  if (brazilian) {
    const year = brazilian[3] || String(new Date().getFullYear());
    return `${year}-${brazilian[2]}-${brazilian[1]}T12:00:00.000Z`;
  }
  return text.includes("T") ? text : `${text}T12:00:00.000Z`;
}

function animalCodeFromLabel(label: unknown) {
  const text = String(label ?? "");
  const match = text.match(/\(([^)]+)\)/);
  return match?.[1] || text;
}

function animalId(store: DemoStore, label: unknown) {
  const target = normalize(animalCodeFromLabel(label));
  const animal = store.animals.find((item) => normalize(item.code) === target || normalize(item.name) === target);
  return animal ? `demo-animal-${animal.code}` : null;
}

function tableRows(context: DemoContext, table: DemoTable): DemoRow[] {
  const { store } = context;
  if (table === TABLES.fazendas) return [{ id: "demo", ativa: true, nome: "Rancho demonstrativo" }];
  if (table === TABLES.usuarios) return [{ id: "demo-user", fazenda_id: "demo", nome: "Demonstração Rancho", telefone: context.phone, papel: "admin", ativo: true }];
  if (table === TABLES.whatsappUsuarios) return [{ id: "demo-whatsapp", fazenda_id: "demo", usuario_id: "demo-user", telefone_e164: context.phone, nome_exibicao: "Demonstração Rancho", papel_bot: "admin", ativo: true }];
  if (table === TABLES.whatsappSessoes) return [{ id: "demo-session", fazenda_id: "demo", telefone_e164: context.phone, etapa: context.session.etapa, dados: context.session.dados, status: "ativa", expira_em: new Date(Date.now() + 1800000).toISOString() }];
  if (table === TABLES.animais) return store.animals.map((item, index) => ({ id: `demo-animal-${item.code}`, fazenda_id: "demo", brinco: item.code, nome: item.name, categoria: normalize(item.category), sexo: normalize(item.category).includes("touro") || normalize(item.category).includes("bezerro") ? "macho" : "femea", fase: normalize(item.phase), status: "ativo", ativo: true, __index: index }));
  if (table === TABLES.lotes) return (store.lots || []).map((item, index) => ({ id: item.id, fazenda_id: "demo", nome: item.name, descricao: item.description || "", ativo: item.active !== false, __index: index }));
  if (table === TABLES.ordenhas) return store.production.map((item, index) => ({ id: `demo-production-${item.id}`, fazenda_id: "demo", animal_id: animalId(store, item.animal), litros: item.liters, ordenhado_em: dateValue(item.date), turno: "manha", origem: "demo", __index: index }));
  if (table === TABLES.transacoesFinanceiras) return store.transactions.map((item, index) => ({ id: `demo-finance-${item.id}`, fazenda_id: "demo", tipo: item.positive ? "entrada" : "saida", valor: item.value, data_transacao: dateValue(item.date), categoria: item.label, descricao: item.label, origem: "demo", __index: index }));
  if (table === TABLES.estoqueItens) return store.stock.map((item, index) => ({ id: `demo-stock-${normalize(item.name)}`, fazenda_id: "demo", nome: item.name, unidade_medida: item.unit, quantidade_atual: item.qty, quantidade_minima: item.min, ativo: true, __index: index }));
  if (table === TABLES.estoqueMovimentacoes) return [];
  if (table === TABLES.eventosAnimal) return (store.events || []).map((item, index) => ({ id: item.id, fazenda_id: "demo", animal_id: animalId(store, item.animal), tipo: item.type, data_evento: dateValue(item.date), descricao: item.notes || "", __index: index }));
  return [];
}

function stripInternal(row: DemoRow) {
  const copy = { ...row };
  delete copy.__index;
  delete copy.__key;
  return copy;
}

function matches(row: DemoRow, filters: Filter[]) {
  return filters.every((filter) => {
    const left = row[filter.column];
    if (filter.kind === "eq") return comparable(left) === comparable(filter.value);
    if (filter.kind === "neq") return comparable(left) !== comparable(filter.value);
    if (filter.kind === "in") return (filter.values || []).some((value) => comparable(left) === comparable(value));
    if (filter.kind === "is") return filter.value === null ? left === null || left === undefined : comparable(left) === comparable(filter.value);
    if (["gte", "lte", "lt", "gt"].includes(filter.kind)) {
      const leftValue = comparable(left);
      const rightValue = comparable(filter.value);
      if (filter.kind === "gte") return leftValue >= rightValue;
      if (filter.kind === "lte") return leftValue <= rightValue;
      if (filter.kind === "lt") return leftValue < rightValue;
      return leftValue > rightValue;
    }
    return true;
  });
}

function applyInsert(context: DemoContext, table: DemoTable, payload: AnyRecord) {
  const { store } = context;
  if (table === TABLES.whatsappSessoes) {
    context.session = {
      etapa: ["aguardando_dado", "aguardando_confirmacao"].includes(String(payload.etapa)) ? String(payload.etapa) as BotSession["etapa"] : "livre",
      dados: (payload.dados || {}) as AnyRecord
    };
    return;
  }
  if (table === TABLES.animais) {
    store.animals.push({ name: String(payload.nome || payload.brinco || "Novo animal"), code: String(payload.brinco || payload.codigo || `demo-${store.animals.length + 1}`), category: String(payload.categoria || "outro"), phase: String(payload.fase || "") });
  } else if (table === TABLES.lotes) {
    store.lots = store.lots || [];
    store.lots.push({ id: String(payload.id || `demo-lot-${store.lots.length + 1}`), name: String(payload.nome || "Novo lote"), description: String(payload.descricao || ""), active: payload.ativo !== false });
  } else if (table === TABLES.estoqueItens) {
    store.stock.push({ name: String(payload.nome || "Novo item"), qty: Number(payload.quantidade_atual || 0), unit: String(payload.unidade_medida || "unidade"), min: Number(payload.quantidade_minima || 0) });
  } else if (table === TABLES.ordenhas) {
    store.production.push({ id: Date.now(), animal: String(payload.animal_id || "Animal"), liters: Number(payload.litros || 0), date: String(payload.ordenhado_em || "Hoje").slice(0, 10) });
  } else if (table === TABLES.transacoesFinanceiras) {
    store.transactions.push({ id: Date.now(), label: String(payload.descricao || payload.categoria || "Movimentação"), date: String(payload.data_transacao || "Hoje").slice(0, 10), value: Number(payload.valor || 0), positive: normalize(payload.tipo) === "entrada" });
  } else if (table === TABLES.eventosAnimal) {
    store.events = store.events || [];
    store.events.push({ id: String(payload.id || `demo-event-${store.events.length + 1}`), animal: String(payload.animal_id || "Animal"), type: String(payload.tipo || "evento"), date: String(payload.data_evento || "Hoje").slice(0, 10), notes: String(payload.descricao || "") });
  }
}

function applyUpdate(context: DemoContext, table: DemoTable, rows: DemoRow[], payload: AnyRecord) {
  if (table === TABLES.estoqueItens) {
    for (const row of rows) {
      const item = context.store.stock[row.__index ?? -1];
      if (!item) continue;
      if (payload.quantidade_atual !== undefined) item.qty = Number(payload.quantidade_atual);
      if (payload.nome !== undefined) item.name = String(payload.nome);
      if (payload.unidade_medida !== undefined) item.unit = String(payload.unidade_medida);
      if (payload.quantidade_minima !== undefined) item.min = Number(payload.quantidade_minima);
    }
  }
}

function buildQuery(context: DemoContext, table: DemoTable): DemoQuery {
  let filters: Filter[] = [];
  let sort: { column: string; ascending: boolean } | null = null;
  let maxRows: number | null = null;
  let range: [number, number] | null = null;
  let single = false;
  let maybeSingle = false;
  let operation: "select" | "insert" | "upsert" | "update" | "delete" = "select";
  let payload: AnyRecord | AnyRecord[] | null = null;

  const query = {
    select(columns?: string) { void columns; return query; },
    eq(column: string, value: unknown) { filters.push({ kind: "eq", column, value }); return query; },
    neq(column: string, value: unknown) { filters.push({ kind: "neq", column, value }); return query; },
    in(column: string, values: unknown[]) { filters.push({ kind: "in", column, values }); return query; },
    gte(column: string, value: unknown) { filters.push({ kind: "gte", column, value }); return query; },
    lte(column: string, value: unknown) { filters.push({ kind: "lte", column, value }); return query; },
    lt(column: string, value: unknown) { filters.push({ kind: "lt", column, value }); return query; },
    gt(column: string, value: unknown) { filters.push({ kind: "gt", column, value }); return query; },
    is(column: string, value: unknown) { filters.push({ kind: "is", column, value }); return query; },
    order(column: string, options?: { ascending?: boolean }) { sort = { column, ascending: options?.ascending !== false }; return query; },
    limit(value: number) { maxRows = value; return query; },
    range(from: number, to: number) { range = [from, to]; return query; },
    insert(value: AnyRecord | AnyRecord[]) { operation = "insert"; payload = value; return query; },
    upsert(value: AnyRecord | AnyRecord[]) { operation = "upsert"; payload = value; return query; },
    update(value: AnyRecord) { operation = "update"; payload = value; return query; },
    delete() { operation = "delete"; return query; },
    single() { single = true; return query; },
    maybeSingle() { maybeSingle = true; return query; },
    then<T>(resolve: (value: { data: AnyRecord | AnyRecord[] | null; error: AnyRecord | null }) => T) {
      return Promise.resolve().then(() => {
        if (operation === "insert" || operation === "upsert") {
          const values = Array.isArray(payload) ? payload : [payload || {}];
          values.forEach((item) => applyInsert(context, table, item));
          return resolve({ data: single ? (values[0] || null) : values, error: null });
        }
        let rows = tableRows(context, table).filter((row) => matches(row, filters));
        if (operation === "update") {
          rows.forEach((row) => applyUpdate(context, table, [row], payload || {}));
          return resolve({ data: single ? (rows[0] ? stripInternal(rows[0]) : null) : rows.map(stripInternal), error: null });
        }
        if (operation === "delete") {
          return resolve({ data: [], error: null });
        }
        if (sort) rows.sort((a, b) => { const direction = sort!.ascending ? 1 : -1; return comparable(a[sort!.column]).localeCompare(comparable(b[sort!.column])) * direction; });
        if (range) rows = rows.slice(range[0], range[1] + 1);
        if (maxRows !== null) rows = rows.slice(0, maxRows);
        if (single || maybeSingle) {
          if (!rows.length && single) return resolve({ data: null, error: { message: "No rows found", code: "PGRST116" } });
          return resolve({ data: rows[0] ? stripInternal(rows[0]) : null, error: null });
        }
        return resolve({ data: rows.map(stripInternal), error: null });
      });
    }
  } as DemoQuery;
  return query;
}

export function createDemoSupabase(store: DemoStore, phone: string, initialSession: BotSession) {
  const context: DemoContext = { store, phone, session: initialSession };
  const client = {
    from(table: string) {
      return buildQuery(context, table);
    }
  };
  return { client, getSession: () => context.session };
}

export type DemoSupabase = ReturnType<typeof createDemoSupabase>;
