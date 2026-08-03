import type { AnyRecord } from "@/lib/types";
import { TABLES } from "@/lib/tables";
import { addRanchDays, getRanchDayRange, getRanchTodayISO, RANCH_TIMEZONE } from "@/lib/dates/ranch-time";
import type { QueryActionPlan, FilterPlan, AggregationPlan } from "@/lib/whatsapp/gemini/action-plan-types";
import { validateActionPlan } from "@/lib/whatsapp/gemini/action-plan-validator";
import { getDomainManifest, type DomainFieldDefinition, type DomainManifestEntry } from "@/lib/whatsapp/gemini/domain-manifest";
import type { ParsedRanchoMessage, RanchoIntent } from "@/lib/whatsapp/nlp";
import { normalizeRanchoText } from "@/lib/whatsapp/nlp-text";
import { detectReproductiveEventKind, reproductiveEventLabel } from "@/lib/whatsapp/nlp-core/reproductive-events";
import { finalizeActionPlanParsed } from "@/lib/whatsapp/action-plan/action-plan-to-parsed";
import {
  semanticPeriod,
  semanticReportType
} from "@/lib/whatsapp/gemini/action-plan-semantic";
import { botQueryDeniedMessage, canQueryBotDomain } from "@/lib/whatsapp/bot-access";

type QueryBuilderLike = AnyRecord;

export type ActionPlanSupabaseLike = {
  from: (tableName: string) => QueryBuilderLike;
};

export type ActionPlanOwnerContext = {
  fazenda_id?: string | null;
  usuario_id?: string | null;
  papel_bot?: string | null;
};

export type ActionPlanQueryPagination = {
  tipo: "action_plan_query";
  domain: string;
  plan: QueryActionPlan;
  currentDate?: string;
  offset: number;
  pageSize: number;
  total: number;
};

export type ExecuteQueryActionPlanInput = {
  plan: QueryActionPlan;
  supabase?: ActionPlanSupabaseLike | null;
  owner: ActionPlanOwnerContext;
  currentDate?: string;
  pagination?: { offset: number; pageSize?: number };
};

export type ExecuteQueryActionPlanResult =
  | {
      ok: true;
      parsed: ParsedRanchoMessage;
      response: string;
      rows: AnyRecord[];
    }
  | {
      ok: false;
      status: "clarify" | "blocked";
      reason: string;
      message: string;
    };

const SAFE_SELECT_FIELDS: Record<string, string[]> = {
  fazenda: ["id", "nome", "cidade", "estado", "descricao", "responsavel"],
  financeiro: ["id", "tipo", "valor", "descricao", "categoria", "data_transacao", "metodo_pagamento", "created_at"],
  producao_leite: ["id", "animal_id", "litros", "ordenhado_em", "turno", "destino", "observacoes", "created_at"],
  reproducao: ["id", "animal_id", "tipo", "data_evento", "descricao", "custo", "created_at"],
  saude_sanitario: ["id", "animal_id", "tipo", "data_evento", "descricao", "medicamento", "dose", "custo", "created_at"],
  animais: ["id", "brinco", "nome", "categoria", "sexo", "fase", "raca", "lote_id", "data_nascimento", "peso", "status", "observacoes"],
  lotes: ["id", "nome", "descricao", "ativo", "created_at"],
  funcionarios: ["id", "nome", "funcao", "cpf", "salario_base", "data_admissao", "contato_whatsapp", "ativo", "deleted_at", "created_at"],
  ponto_funcionario: ["id", "funcionario_id", "tipo", "registrado_em", "observacao", "created_at"],
  observacoes: ["id", "animal_id", "tipo", "data_evento", "descricao", "created_at"],
  genealogia: ["id", "brinco", "nome", "pai_id", "mae_id", "data_nascimento", "observacoes"],
  agenda_tarefas: ["id", "titulo", "mensagem", "created_at"]
};

const QUERY_INTENT_BY_DOMAIN: Record<string, RanchoIntent> = {
  fazenda: "CONSULTA_RANCHO",
  financeiro: "CONSULTA_FINANCEIRO",
  producao_leite: "CONSULTA_PRODUCAO",
  reproducao: "CONSULTA_REGISTROS_HOJE",
  saude_sanitario: "CONSULTA_REGISTROS_HOJE",
  estoque: "CONSULTA_ESTOQUE_GERAL",
  animais: "CONSULTA_REBANHO",
  lotes: "CONSULTA_LOTES",
  funcionarios: "CONSULTA_FUNCIONARIO",
  ponto_funcionario: "CONSULTA_PONTO",
  genealogia: "CONSULTA_GENEALOGIA",
  observacoes: "CONSULTA_REGISTROS_HOJE",
  agenda_tarefas: "CONSULTA_REGISTROS_HOJE"
};

function dateOnly(value: Date) {
  return getRanchTodayISO(value);
}

function parseDate(value: unknown) {
  if (!value) return null;
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return getRanchDayRange(text).start;
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(text)) {
    const [day, month, rawYear] = text.split(/[/-]/).map(Number);
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;
    return getRanchDayRange(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`).start;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function currentDate(input?: string) {
  const parsed = parseDate(input || "");
  return parsed || getRanchDayRange(getRanchTodayISO()).start;
}

function monthStart(dateISO: string) {
  return `${dateISO.slice(0, 7)}-01`;
}

function addMonths(dateISO: string, months: number) {
  const [year, month] = dateISO.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, 1, 12));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

const RANCH_MONTHS = [
  "janeiro",
  "fevereiro",
  "marco",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro"
];

function monthIndex(value: unknown) {
  const text = normalizedText(value);
  return RANCH_MONTHS.findIndex((month) => text.includes(month));
}

function monthNameFromText(value: unknown) {
  const explicit = String(value || "").match(/^(\d{4})-(\d{2})$/);
  if (explicit) {
    const month = RANCH_MONTHS[Number(explicit[2]) - 1];
    if (month) return `${month} de ${explicit[1]}`;
  }
  const index = monthIndex(value);
  return index >= 0 ? RANCH_MONTHS[index] : "";
}

function isOpenEndedSinceText(value: unknown) {
  return /\b(?:desde|a\s+partir)\b/.test(normalizedText(value));
}

function normalizedText(value: unknown) {
  return normalizeRanchoText(String(value ?? ""));
}

function eventReportPeriod(plan: QueryActionPlan) {
  const semanticNormalized = normalizedText(semanticPeriod(plan));
  const dateFilter = plan.filters.find((filter) => ["data", "data_evento", "created_at", "registrado_em"].includes(filter.field));
  if (/\bhoje\b/.test(semanticNormalized)) return { period: "hoje" };
  if (/\bontem\b/.test(semanticNormalized)) return { period: "ontem" };
  if (/\bsemana\b/.test(semanticNormalized)) return { period: "semana" };
  if (/\b(?:mes passado|mes anterior|ultimo mes)\b/.test(semanticNormalized.replace(/_/g, " "))) return { period: "mes_passado" };
  if (/\bmes\b/.test(semanticNormalized)) return { period: "mes" };
  if (/\bano\b/.test(semanticNormalized)) return { period: "ano" };
  const daysMatch = semanticNormalized.match(/\bultim[oa]s?\s+(\d+)\s+dias?\b/);
  if (daysMatch) return { period: `ultimos_${daysMatch[1]}`, days: Number(daysMatch[1]) };
  if (dateFilter?.op === "current_month") return { period: "mes" };
  if (dateFilter?.op === "previous_month") return { period: "mes_passado" };
  if (dateFilter?.op === "current_week") return { period: "semana" };
  if (dateFilter?.op === "current_year") return { period: "ano" };
  if (dateFilter?.op === "last_days" && Number(dateFilter.value) === 1) return { period: "hoje" };
  if (dateFilter?.op === "last_days" && Number(dateFilter.value)) return { period: `ultimos_${Number(dateFilter.value)}`, days: Number(dateFilter.value) };
  if (dateFilter?.op === "eq" && String(dateFilter.value || "").toLowerCase() === "ontem") return { period: "ontem" };
  return { period: "hoje" };
}

function genericEventReportMode(plan: QueryActionPlan) {
  const normalized = normalizedText(plan.semantic?.report?.detailLevel);
  if (/\b(?:tudo|detalhado|movimentacoes?|atividades?)\b/.test(normalized)) return "detalhado";
  if (/\b(?:resumo rapido|rapido)\b/.test(normalized)) return "rapido";
  if (/\b(?:foi bem|indo bem|analise|analisar)\b/.test(normalized)) return "analise";
  return undefined;
}

function shouldUseGeneralEventReport(plan: QueryActionPlan) {
  if (!["saude_sanitario", "reproducao", "observacoes", "agenda_tarefas"].includes(plan.domain)) return false;
  if (plan.filters.some((filter) => ["animal_ref", "lote_ref", "funcionario_ref", "item_ref", "evento", "tipo", "status_reprodutivo"].includes(filter.field))) return false;
  const semantic = plan.semantic;
  const reportType = semanticReportType(plan);
  const descriptor = normalizedText([
    semantic?.intent,
    semantic?.scope,
    semantic?.operation,
    semantic?.report?.type,
    plan.operation,
    ...(Array.isArray(semantic?.domains) ? semantic.domains : [])
  ].filter(Boolean).join(" "));
  return reportType === "eventos"
    || reportType === "relatorio"
    || /\b(?:eventos gerais|registros gerais|ocorrencias gerais)\b/.test(descriptor.replace(/_/g, " "))
    || /\b(?:geral|eventos|registros|ocorrencias|fazenda|rancho|tudo)\b/.test(descriptor)
    || (Array.isArray(semantic?.domains) && semantic.domains.length > 1);
}

function executeGeneralEventReportQuery(input: ExecuteQueryActionPlanInput, plan: QueryActionPlan): ExecuteQueryActionPlanResult {
  const { period, days } = eventReportPeriod(plan);
  const mode = genericEventReportMode(plan);
  const reportType = semanticReportType(plan);
  const consultaRegistros = reportType === "eventos"
    ? "eventos"
    : reportType === "relatorio"
      ? "relatorio"
      : "eventos";
  const parsed = finalizeActionPlanParsed("CONSULTA_REGISTROS_HOJE", {
    consulta: true,
    consulta_registros: consultaRegistros,
    data_referencia: period,
    periodo: period,
    ...(days ? { dias: days } : {}),
    ...(mode ? { relatorio_modo: mode } : {})
  }, [], plan.confidence, plan, {
    interpreterFinal: "action_plan_query_normalized",
    extra: {
      action_plan_domain: "eventos_gerais",
      action_plan_original_domain: plan.domain,
      action_plan_query_normalized: true
    }
  });
  return {
    ok: true,
    parsed,
    response: "Consulta geral de eventos preparada.",
    rows: []
  };
}

function dateRangeFor(filter: FilterPlan, baseDate: Date) {
  const baseISO = dateOnly(baseDate);
  const end = getRanchDayRange(baseISO).end;

  if (filter.op === "last_days") {
    const startDate = addRanchDays(baseISO, -Math.max(0, Number(filter.value || 1) - 1));
    return { start: getRanchDayRange(startDate).start, end };
  }

  if (filter.op === "last_months") {
    const startDate = addMonths(monthStart(baseISO), -Math.max(0, Number(filter.value || 1) - 1));
    return { start: getRanchDayRange(startDate).start, end };
  }

  if (filter.op === "previous_month") {
    const currentMonthStart = monthStart(baseISO);
    const previousMonthStart = addMonths(currentMonthStart, -1);
    return {
      start: getRanchDayRange(previousMonthStart).start,
      end: getRanchDayRange(currentMonthStart).start
    };
  }

  if (filter.op === "current_month") {
    const startDate = monthStart(baseISO);
    return { start: getRanchDayRange(startDate).start, end: getRanchDayRange(addMonths(startDate, 1)).start };
  }

  if (filter.op === "current_year") {
    const year = baseISO.slice(0, 4);
    return { start: getRanchDayRange(`${year}-01-01`).start, end: getRanchDayRange(`${Number(year) + 1}-01-01`).start };
  }

  // "essa semana" nao tinha operador: o modelo tentava current_week, o
  // validador recusava e a pergunta virava outro recorte. Semana comeca na
  // segunda, que e como o produtor conta a semana de trabalho.
  if (filter.op === "current_week") {
    const reference = new Date(`${baseISO}T12:00:00.000Z`);
    const weekday = (reference.getUTCDay() + 6) % 7;
    const startISO = addRanchDays(baseISO, -weekday);
    return { start: getRanchDayRange(startISO).start, end: getRanchDayRange(addRanchDays(startISO, 7)).start };
  }

  if (filter.op === "since") {
    const month = monthIndex(filter.value);
    const start = month >= 0
      ? getRanchDayRange(`${baseISO.slice(0, 4)}-${String(month + 1).padStart(2, "0")}-01`).start
      : parseDate(filter.value) || getRanchDayRange(`${baseISO.slice(0, 4)}-01-01`).start;
    return { start, end };
  }

  if (filter.op === "between") {
    const raw = filter.value as AnyRecord | unknown[];
    const explicitMonth = !Array.isArray(raw) && raw?.month ? String(raw.month).match(/^(\d{4})-(\d{2})$/) : null;
    if (explicitMonth) {
      const startDate = `${explicitMonth[1]}-${explicitMonth[2]}-01`;
      return { start: getRanchDayRange(startDate).start, end: getRanchDayRange(addMonths(startDate, 1)).start };
    }
    const month = !Array.isArray(raw) && raw?.month ? monthIndex(raw.month) : -1;
    if (month >= 0) {
      const startDate = `${baseISO.slice(0, 4)}-${String(month + 1).padStart(2, "0")}-01`;
      return { start: getRanchDayRange(startDate).start, end: getRanchDayRange(addMonths(startDate, 1)).start };
    }
    const from = Array.isArray(raw) ? raw[0] : raw?.from;
    const to = Array.isArray(raw) ? raw[1] : raw?.to;
    const start = parseDate(from);
    const rangeEnd = parseDate(to);
    if (start && rangeEnd) return { start, end: getRanchDayRange(dateOnly(rangeEnd)).end };
  }

  return null;
}

function sourceField(domain: DomainManifestEntry, fieldName: string) {
  return domain.fields[fieldName]?.sourceField || fieldName;
}

function shouldApplyRemoteDateFilter(domain: DomainManifestEntry) {
  return domain.domain !== "producao_leite";
}

function queryTable(domain: DomainManifestEntry) {
  if (domain.tableName) return domain.tableName;
  if (domain.domain === "estoque") return TABLES.estoqueMovimentacoes;
  if (domain.domain === "genealogia") return TABLES.animais;
  // observacoes e agenda_tarefas so declaram sourceName. Sem esta linha,
  // "eventos que a 090 ja teve" caia em "nao tenho mapeamento seguro", porque
  // o relatorio geral atendia observacoes mas a consulta por animal nao.
  if (domain.sourceName && !domain.sourceName.includes("+")) return domain.sourceName;
  return null;
}

function normalizeFinanceType(value: unknown) {
  const text = normalizedText(value);
  if (text === "despesa" || text === "saida") return "saida";
  if (text === "receita" || text === "entrada") return "entrada";
  return text;
}

function compactComparable(value: unknown) {
  return normalizedText(value).replace(/[^a-z0-9]/g, "");
}

function referenceMatches(candidates: unknown[], target: unknown) {
  const normalizedTarget = normalizedText(target);
  const compactTarget = compactComparable(target);
  const numericTarget = /\d/.test(normalizedTarget);
  const identifierTarget = normalizedTarget.match(/\b[a-z]{0,4}-?\d+[a-z0-9-]*\b/)?.[0];
  const compactIdentifierTarget = compactComparable(identifierTarget);
  if (!normalizedTarget) return false;
  return candidates.some((candidate) => {
    const normalizedCandidate = normalizedText(candidate);
    const compactCandidate = compactComparable(candidate);
    if (!normalizedCandidate) return false;
    const candidatePhrase = ` ${normalizedCandidate} `;
    const targetPhrase = ` ${normalizedTarget} `;
    return normalizedCandidate === normalizedTarget
      || compactCandidate === compactTarget
      || Boolean(compactIdentifierTarget && compactCandidate === compactIdentifierTarget)
      || (!numericTarget && normalizedCandidate.includes(normalizedTarget))
      || (!numericTarget && compactTarget.length >= 3 && compactCandidate.includes(compactTarget))
      || (!numericTarget && normalizedCandidate.length >= 3 && targetPhrase.includes(candidatePhrase));
  });
}

function relationCandidateValues(row: AnyRecord, domain: DomainManifestEntry, fieldName: string, relations: AnyRecord) {
  if (fieldName === "animal_ref") {
    if (domain.domain === "genealogia" || domain.domain === "animais") {
      return [row.brinco, row.nome, row.id].filter(Boolean);
    }
    const animal = relations.animalsById?.get(String(row.animal_id || ""));
    return [animal?.brinco, animal?.nome, animal?.id, row.animal_id].filter(Boolean);
  }
  if (fieldName === "funcionario_ref") {
    if (domain.domain === "funcionarios") return [row.nome, row.id].filter(Boolean);
    const employee = relations.employeesById?.get(String(row.funcionario_id || ""));
    return [employee?.nome, employee?.id, row.funcionario_id].filter(Boolean);
  }
  if (fieldName === "item_ref") {
    return [row.item_id, row.item_ref, row.nome].filter(Boolean);
  }
  if (domain.domain === "genealogia" && fieldName === "pai_ref") {
    const father = relations.animalsById?.get(String(row.pai_id || ""));
    return [father?.brinco, father?.nome, father?.id, row.pai_id].filter(Boolean);
  }
  if (domain.domain === "genealogia" && fieldName === "mae_ref") {
    const mother = relations.animalsById?.get(String(row.mae_id || ""));
    return [mother?.brinco, mother?.nome, mother?.id, row.mae_id].filter(Boolean);
  }
  if (domain.domain === "genealogia" && fieldName === "filho_ref") {
    return [row.brinco, row.nome, row.id].filter(Boolean);
  }
  return [];
}

function rowValue(row: AnyRecord, domain: DomainManifestEntry, fieldName: string, relations: AnyRecord) {
  if (fieldName === "animal_categoria") {
    if (domain.domain === "animais") return row.categoria;
    return relations.animalsById?.get(String(row.animal_id || ""))?.categoria;
  }
  if (fieldName === "animal_ref") {
    if (domain.domain === "genealogia" || domain.domain === "animais") return [row.brinco, row.nome, row.categoria].filter(Boolean).join(" ");
    const animal = relations.animalsById?.get(String(row.animal_id || ""));
    return [animal?.brinco, animal?.nome, animal?.categoria].filter(Boolean).join(" ");
  }
  if (fieldName === "funcionario_ref") {
    const employee = relations.employeesById?.get(String(row.funcionario_id || ""));
    return [employee?.nome, employee?.funcao].filter(Boolean).join(" ");
  }
  const source = sourceField(domain, fieldName);
  if (domain.dateFields.includes(fieldName)) {
    const value = row[source];
    return value || (source !== "created_at" ? row.created_at : value);
  }
  if (domain.domain === "financeiro" && fieldName === "tipo") return normalizeFinanceType(row[source]);
  if (domain.domain === "financeiro" && fieldName === "descricao") return [row.descricao, row.categoria, row.metodo_pagamento].filter(Boolean).join(" ");
  if (domain.domain === "reproducao" && fieldName === "evento") return normalizedText(row[source]);
  return row[source];
}

function compareText(left: unknown, right: unknown) {
  return normalizedText(left) === normalizedText(right);
}

function animalCategoryMatches(row: AnyRecord, target: unknown) {
  const requested = animalCategoryFromQueryText(target) || normalizedText(target);
  const rowCategory = animalCategoryFromQueryText(row.categoria) || normalizedText(row.categoria);
  if (!requested) return true;
  if (rowCategory === requested) return true;
  if (requested === "bezerro" && ["bezerro", "bezerra"].includes(rowCategory)) return true;
  const name = normalizedText(row.nome);
  return requested.length >= 3 && name.includes(requested);
}

function filterMatches(row: AnyRecord, domain: DomainManifestEntry, filter: FilterPlan, relations: AnyRecord, baseDate: Date): boolean {
  const value = rowValue(row, domain, filter.field, relations);
  const text = normalizedText(value);
  const target = domain.domain === "financeiro" && filter.field === "tipo"
    ? normalizeFinanceType(filter.value)
    : normalizedText(filter.value);

  if (filter.op === "in") {
    const values = Array.isArray(filter.value) ? filter.value : [filter.value];
    return values.some((item) => filterMatches(row, domain, { ...filter, op: "eq", value: item }, relations, baseDate));
  }

  if (filter.op === "is_null") {
    if (relationCandidateValues(row, domain, filter.field, relations).length > 0) return false;
    return value === null || value === undefined || value === "";
  }

  if (domain.domain === "animais" && filter.field === "categoria") {
    if (filter.op === "eq") return animalCategoryMatches(row, filter.value);
    if (filter.op === "neq") return !animalCategoryMatches(row, filter.value);
  }
  if (domain.domain === "animais" && filter.field === "animal_ref") {
    const collectiveCategory = collectiveAnimalCategory(filter.value);
    if (collectiveCategory) {
      if (filter.op === "eq") return animalCategoryMatches(row, collectiveCategory);
      if (filter.op === "neq") return !animalCategoryMatches(row, collectiveCategory);
    }
  }
  if (filter.field === "animal_categoria") {
    const animal = domain.domain === "animais"
      ? row
      : relations.animalsById?.get(String(row.animal_id || ""));
    if (filter.op === "eq") return animalCategoryMatches(animal || {}, filter.value);
    if (filter.op === "neq") return !animalCategoryMatches(animal || {}, filter.value);
  }

  const relationCandidates = relationCandidateValues(row, domain, filter.field, relations);
  if (relationCandidates.length) {
    if (filter.op === "eq") return referenceMatches(relationCandidates, filter.value);
    if (filter.op === "contains") return relationCandidates.some((candidate) => normalizedText(candidate).includes(target));
  }

  if (filter.op === "eq") return compareText(value, target);
  if (filter.op === "neq") return !compareText(value, target);
  if (filter.op === "contains") return text.includes(target);

  const definition = domain.fields[filter.field];
  const isDate = definition?.type === "date" || definition?.type === "datetime" || domain.dateFields.includes(filter.field);
  const isNumber = definition?.type === "number";

  if (isDate) {
    const parsed = parseDate(value);
    if (!parsed) return false;
    const range = dateRangeFor(filter, baseDate);
    if (range) return parsed >= range.start && parsed < range.end;
    const filterDate = parseDate(filter.value);
    if (!filterDate) return false;
    if (filter.op === "gte" || filter.op === "since") return parsed >= filterDate;
    if (filter.op === "lte") return parsed <= filterDate;
  }

  if (isNumber) {
    const left = Number(value);
    const right = Number(filter.value);
    if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
    if (filter.op === "gte") return left >= right;
    if (filter.op === "lte") return left <= right;
    if (filter.op === "between" && Array.isArray(filter.value)) {
      return left >= Number(filter.value[0]) && left <= Number(filter.value[1]);
    }
  }

  return true;
}

function fieldNumber(row: AnyRecord, domain: DomainManifestEntry, fieldName: string, relations: AnyRecord) {
  const value = Number(rowValue(row, domain, fieldName, relations));
  return Number.isFinite(value) ? value : 0;
}

function aggregationValue(rows: AnyRecord[], aggregation: AggregationPlan, domain: DomainManifestEntry, relations: AnyRecord) {
  const values = rows.map((row) => fieldNumber(row, domain, aggregation.field, relations));
  if (aggregation.op === "count") return rows.length;
  if (aggregation.op === "sum") return values.reduce((sum, value) => sum + value, 0);
  if (aggregation.op === "avg") return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  if (aggregation.op === "min") return values.length ? Math.min(...values) : 0;
  if (aggregation.op === "max") return values.length ? Math.max(...values) : 0;
  return 0;
}

function monthKey(row: AnyRecord, domain: DomainManifestEntry, plan: QueryActionPlan, relations: AnyRecord) {
  const dateField = plan.filters.find((filter) => domain.dateFields.includes(filter.field))?.field || domain.dateFields[0];
  const parsed = parseDate(rowValue(row, domain, dateField, relations));
  return parsed ? `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}` : "sem_data";
}

function groupDescriptor(row: AnyRecord, fieldName: string, domain: DomainManifestEntry, plan: QueryActionPlan, relations: AnyRecord) {
  if (fieldName === "month") {
    const value = monthKey(row, domain, plan, relations);
    return { key: value, value };
  }
  if (fieldName === "animal_ref") {
    const animalId = String(row.animal_id || row.id || "");
    const animal = domain.domain === "animais" ? row : relations.animalsById?.get(animalId);
    return { key: animalId || normalizedText(animalLabel(animal)), value: animalLabel(animal) };
  }
  if (fieldName === "funcionario_ref") {
    const employeeId = String(row.funcionario_id || row.id || "");
    const employee = domain.domain === "funcionarios" ? row : relations.employeesById?.get(employeeId);
    return { key: employeeId || normalizedText(employee?.nome), value: employee?.nome || employeeId || "Funcionario" };
  }
  const value = rowValue(row, domain, fieldName, relations);
  return { key: normalizedText(value) || "sem_valor", value };
}

function aggregationMetricKey(aggregation: AggregationPlan) {
  return aggregation.as || `${aggregation.op}_${aggregation.field}`;
}

function groupedAggregationValue(group: AnyRecord, plan: QueryActionPlan) {
  const orderField = plan.orderBy?.field;
  const aggregation = plan.aggregations?.find((item) => item.field === orderField || aggregationMetricKey(item) === orderField)
    || plan.aggregations?.[0];
  if (aggregation) return Number(group.metrics?.[aggregationMetricKey(aggregation)] || 0);
  const groupedValue = orderField ? group.values?.[orderField] : undefined;
  return typeof groupedValue === "number" ? groupedValue : normalizedText(groupedValue);
}

function buildAggregations(rows: AnyRecord[], plan: QueryActionPlan, domain: DomainManifestEntry, relations: AnyRecord) {
  const aggregations = plan.aggregations || [];
  const totals = Object.fromEntries(
    aggregations.map((aggregation) => [
      aggregation.as || `${aggregation.op}_${aggregation.field}`,
      aggregationValue(rows, aggregation, domain, relations)
    ])
  );

  if (!plan.groupBy?.length) return { totals };

  const groupedRows = new Map<string, { values: AnyRecord; rows: AnyRecord[] }>();
  for (const row of rows) {
    const descriptors = plan.groupBy.map((fieldName) => groupDescriptor(row, fieldName, domain, plan, relations));
    const key = descriptors.map((descriptor) => descriptor.key).join("::");
    const values = Object.fromEntries(plan.groupBy.map((fieldName, index) => [fieldName, descriptors[index].value]));
    const current = groupedRows.get(key);
    groupedRows.set(key, { values: current?.values || values, rows: [...(current?.rows || []), row] });
  }

  const groups = Array.from(groupedRows.entries()).map(([key, group]) => ({
    key,
    label: plan.groupBy?.map((fieldName) => String(group.values[fieldName] ?? "")).filter(Boolean).join(" / ") || key,
    values: group.values,
    metrics: Object.fromEntries(
      aggregations.map((aggregation) => [
        aggregationMetricKey(aggregation),
        aggregationValue(group.rows, aggregation, domain, relations)
      ])
    ),
    registros: group.rows.length
  }));

  if (plan.orderBy) {
    const direction = plan.orderBy.direction === "asc" ? 1 : -1;
    groups.sort((left, right) => {
      const leftValue = groupedAggregationValue(left, plan);
      const rightValue = groupedAggregationValue(right, plan);
      if (typeof leftValue === "number" && typeof rightValue === "number") return (leftValue - rightValue) * direction;
      return String(leftValue).localeCompare(String(rightValue), "pt-BR") * direction;
    });
  }

  const byMonth = plan.groupBy.includes("month")
    ? Object.fromEntries(groups.map((group) => [String(group.values.month), group.metrics]))
    : undefined;

  return { totals, ...(byMonth ? { byMonth } : {}), groups };
}

function resolveGroupLabel(group: AnyRecord, plan: QueryActionPlan, relations: AnyRecord) {
  const raw = String(group.label ?? "");
  if (!raw) return "Sem identificação";
  const groupField = plan.groupBy?.[0];
  if (groupField && /ref|_id/.test(groupField)) {
    const key = String(group.values?.[groupField] ?? raw);
    const animal = relations.animalsById?.get(key);
    if (animal) return animalLabel(animal);
    const employee = relations.employeesById?.get(key);
    if (employee) return String(employee.nome || key);
  }
  return raw;
}

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
    .format(Number(value || 0))
    .replace(/\u00a0/g, " ");
}

function numberText(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function shortDate(value: unknown) {
  const parsed = parseDate(value);
  if (!parsed) return "sem data";
  const [year, month, day] = dateOnly(parsed).split("-");
  return `${day}/${month}/${year}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EVENT_TYPE_LABEL: Record<string, string> = {
  parto: "Parto",
  aborto: "Aborto",
  inseminacao: "Inseminação",
  prenhez: "Prenhez",
  pre_parto: "Pré-parto",
  cio: "Cio",
  protocolo: "Protocolo",
  reteste: "Reteste",
  vacina: "Vacina",
  doenca: "Doença",
  tratamento: "Tratamento",
  pesagem: "Pesagem",
  morte: "Morte",
  observacao: "Observação"
};

function eventTypeLabel(value: unknown) {
  const key = normalizedText(value).replace(/\s+/g, "_");
  return EVENT_TYPE_LABEL[key] || String(value || "Evento");
}

/** Historico do animal: o que aconteceu com ele, com data e observacao. */
function animalHistoryLines(relations: AnyRecord) {
  const history = relations.animalHistory as AnyRecord | undefined;
  if (!history) return [];
  const events = (history.eventos || []) as AnyRecord[];
  const milkings = (history.ordenhas || []) as AnyRecord[];
  const lines: string[] = [];

  if (events.length) {
    lines.push("", `Histórico de eventos (${events.length}):`);
    events.slice(0, 15).forEach((event, index) => {
      const detail = [event.descricao, event.medicamento].filter(Boolean).join(" - ");
      lines.push(`${index + 1}. ${shortDate(event.data_evento || event.created_at)} - ${eventTypeLabel(event.tipo)}${detail ? ` - ${detail}` : ""}`);
    });
    if (events.length > 15) lines.push(`...e mais ${events.length - 15} evento(s).`);
  } else {
    lines.push("", "Histórico de eventos: sem registros.");
  }

  if (milkings.length) {
    const total = milkings.reduce((sum, row) => sum + Number(row.litros || 0), 0);
    lines.push("", `Últimas ordenhas (${milkings.length}, total ${numberText(total)} L):`);
    milkings.slice(0, 5).forEach((row) => {
      lines.push(`- ${shortDate(row.ordenhado_em)} - ${numberText(Number(row.litros || 0))} L${row.turno ? ` (${row.turno})` : ""}`);
    });
  }

  return lines;
}

/** Data e hora no fuso do rancho. O ISO cru mostra UTC e adianta o relogio. */
function ranchDateTimeText(value: unknown) {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: RANCH_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(date).replace(", ", " as ");
}

/**
 * Nenhum identificador interno pode chegar ao usuario, em nenhum dominio.
 * Cada *_id vira o nome/brinco correspondente; o que nao resolve e removido
 * em vez de aparecer como UUID. Datas com hora saem no fuso do rancho, porque
 * o ISO cru exibe UTC e mostra um horario que nao foi o do registro.
 */
function sanitizeRowForUser(row: AnyRecord, relations: AnyRecord): AnyRecord {
  const output: AnyRecord = {};
  for (const [key, value] of Object.entries(row)) {
    if (key === "id" || key === "fazenda_id") continue;
    if (key.endsWith("_id")) {
      const label = key === "funcionario_id"
        ? relations.employeesById?.get(String(value || ""))?.nome
        : key === "lote_id"
          ? relations.lotsById?.get(String(value || ""))?.nome
          : animalLabel(relations.animalsById?.get(String(value || "")));
      const clean = String(label || "").trim();
      if (clean && !UUID_RE.test(clean)) output[key.replace(/_id$/, "")] = clean;
      continue;
    }
    if (typeof value === "string" && UUID_RE.test(value.trim())) continue;
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      output[key] = ranchDateTimeText(value) || value;
      continue;
    }
    output[key] = value;
  }
  return output;
}

function daysSince(value: unknown, baseDate: Date) {
  const parsed = parseDate(value);
  if (!parsed) return null;
  const baseDay = getRanchDayRange(dateOnly(baseDate)).start;
  const eventDay = getRanchDayRange(dateOnly(parsed)).start;
  const diff = Math.floor((baseDay.getTime() - eventDay.getTime()) / 86400000);
  return Number.isFinite(diff) && diff >= 0 ? diff : null;
}

function animalLabel(row?: AnyRecord | null) {
  if (!row) return "Animal";
  const brinco = String(row.brinco || "").trim();
  const nome = String(row.nome || "").trim();
  if (brinco && nome && normalizedText(brinco) !== normalizedText(nome)) return `${nome} (${brinco})`;
  return brinco || nome || String(row.id || "Animal");
}

function animalCategoryFromQueryText(value: unknown) {
  const text = normalizedText(value);
  if (/\b(?:vacas?|vagas?|matrizes?)\b/.test(text)) return "vaca";
  if (/\bbois?\b/.test(text)) return "boi";
  if (/\btouros?\b/.test(text)) return "touro";
  if (/\bbezerras?\b/.test(text)) return "bezerro";
  if (/\bbezerros?\b/.test(text)) return "bezerro";
  if (/\bnovilhas?\b/.test(text)) return "novilha";
  return null;
}

function animalCategoryPlural(category: unknown) {
  const text = normalizedText(category);
  if (text === "vaca") return "vacas";
  if (text === "boi") return "bois";
  if (text === "touro") return "touros";
  if (text === "bezerro") return "bezerros";
  if (text === "novilha") return "novilhas";
  return "animais";
}

function collectiveAnimalCategory(value: unknown) {
  return isCollectiveAnimalRef(value) ? animalCategoryFromQueryText(value) : null;
}

function isCollectiveAnimalRef(value: unknown) {
  const text = normalizedText(value);
  if (/^(?:vaca|vacas|vaga|vagas|animal|animais|rebanho|gado|boi|bois|touro|touros|bezerro|bezerros|bezerra|bezerras|novilha|novilhas|meus animais|minhas vacas)$/.test(text)) return true;
  const hasCollectiveCategory = /\b(?:vacas?|vagas?|animais|rebanho|gado|bois?|touros?|bezerros?|bezerras?|novilhas?)\b/.test(text);
  const hasQueryQualifier = /\b(?:quais?|lista|listar|dados|relatorio|resumo|cadastrados?|cadastradas?|meus|minhas|todos?|todas?)\b/.test(text);
  return hasCollectiveCategory && hasQueryQualifier;
}

function hasSpecificAnimalRefFilter(plan: QueryActionPlan) {
  return plan.filters.some((filter) => filter.field === "animal_ref" && !isCollectiveAnimalRef(filter.value));
}

function domainDateFilterField(filter: FilterPlan) {
  return ["data", "data_transacao", "created_at", "registrado_em", "ordenhado_em", "data_evento"].includes(filter.field);
}

function countByText(rows: AnyRecord[], selector: (row: AnyRecord) => unknown) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = String(selector(row) || "sem informação").trim() || "sem informação";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([label, total]) => `${label}: ${total}`)
    .join(", ");
}

function buildAnimalCollectiveResponse(rows: AnyRecord[], plan: QueryActionPlan, offset = 0, pageSize = 10) {
  const category = plan.filters.find((filter) => filter.field === "categoria")?.value
    || plan.filters.map((filter) => filter.field === "animal_ref" ? collectiveAnimalCategory(filter.value) : null).find(Boolean);
  const label = animalCategoryPlural(category);
  if (!rows.length) return `Não encontrei ${label} cadastrados no rebanho.`;

  const countOnly = Boolean(plan.aggregations?.some((aggregation) => aggregation.op === "count"))
    || normalizedText(plan.semantic?.report?.type) === "contagem";
  if (countOnly) {
    const status = plan.filters.find((filter) => filter.field === "status" && filter.op === "eq")?.value;
    const statusSuffix = normalizedText(status) === "ativo" ? " ativos" : status ? ` com status ${status}` : "";
    return `Total de ${label}${statusSuffix}: ${rows.length}.`;
  }

  const active = rows.filter((row) => !["morto", "inativo", "vendido"].includes(normalizedText(row.status || "ativo"))).length;
  const categories = countByText(rows, (row) => row.categoria || "sem categoria");
  const statuses = countByText(rows, (row) => row.status || "ativo");
  const pageRows = rows.slice(offset, offset + pageSize);
  const sample = pageRows.map((row, index) => {
    const categoryText = row.categoria ? ` - ${row.categoria}` : "";
    const statusText = row.status ? ` - ${row.status}` : "";
    return `${offset + index + 1}. ${animalLabel(row)}${categoryText}${statusText}`;
  });

  if (offset) {
    const nextOffset = offset + pageRows.length;
    return [
      `Mais ${label}:`,
      ...sample,
      nextOffset < rows.length ? `...e mais ${rows.length - nextOffset} animal(is). Responda "mostrar mais" para continuar.` : "Fim da lista."
    ].join("\n");
  }

  return [
    category ? `Dados das ${label}:` : "Resumo do rebanho:",
    `Total encontrado: ${rows.length}.`,
    `Ativos: ${active}.`,
    `Categorias: ${categories || "sem dados"}.`,
    `Status: ${statuses || "sem dados"}.`,
    "",
    "Amostra:",
    ...sample,
    rows.length > sample.length ? `...e mais ${rows.length - sample.length} animal(is). Responda "mostrar mais" para continuar.` : ""
  ].filter(Boolean).join("\n");
}

function stockAmount(quantity: unknown, unit: unknown) {
  return `${numberText(Number(quantity || 0))} ${String(unit || "unidade")}`.trim();
}

function queryEventKind(row: AnyRecord) {
  return detectReproductiveEventKind([row.tipo, row.descricao, row.medicamento].filter(Boolean).join(" "))
    || (normalizedText(row.tipo) === "parto" ? "parto" : undefined);
}

function eventTime(row: AnyRecord) {
  const ms = Date.parse(String(row.data_evento || row.created_at || ""));
  return Number.isFinite(ms) ? ms : 0;
}

function latestEventOfKind(events: AnyRecord[], kind: string) {
  return events.find((event) => event.kind === kind) || null;
}

function hasLaterReproductiveOutcome(events: AnyRecord[], reference: AnyRecord | null | undefined, outcomes: string[]) {
  if (!reference) return false;
  const referenceTime = eventTime(reference);
  return events.some((event) => eventTime(event) > referenceTime && outcomes.includes(String(event.kind || "")));
}

function activeReproductionEventForKind(events: AnyRecord[], kind?: string) {
  if (!kind) return null;
  if (kind === "inseminacao") {
    const insemination = latestEventOfKind(events, "inseminacao");
    return insemination && !hasLaterReproductiveOutcome(events, insemination, ["prenhez", "pre_parto", "parto"])
      ? insemination
      : null;
  }
  if (kind === "prenhez") {
    const preBirth = latestEventOfKind(events, "pre_parto");
    if (preBirth && !hasLaterReproductiveOutcome(events, preBirth, ["parto"])) return preBirth;
    const pregnancy = latestEventOfKind(events, "prenhez");
    return pregnancy && !hasLaterReproductiveOutcome(events, pregnancy, ["parto"]) ? pregnancy : null;
  }
  if (kind === "pre_parto") {
    const preBirth = latestEventOfKind(events, "pre_parto");
    return preBirth && !hasLaterReproductiveOutcome(events, preBirth, ["parto"]) ? preBirth : null;
  }
  if (kind === "protocolo" || kind === "reteste") return latestEventOfKind(events, kind);
  return latestEventOfKind(events, kind);
}

function targetReproductionKind(plan: QueryActionPlan) {
  const raw = [
    ...plan.filters.map((filter) => String(filter.value || "")),
    plan.operation || "",
    plan.semantic?.intent || "",
    plan.semantic?.operation || ""
  ].join(" ");
  const text = normalizedText(raw);
  if (/\b(?:prenhas?|prenhes|prenhe|prenhez|gestantes?|gestacao)\b/.test(text)) return "prenhez";
  if (/\b(?:inseminad[ao]s?|inseminacao|ia|iatf)\b/.test(text)) return "inseminacao";
  if (/\b(?:paridas?|pariram|partos?|pariu|recem parida)\b/.test(text)) return "parto";
  if (/\bprotocolo\b/.test(text) || text.includes("em_protocolo")) return "protocolo";
  if (/\breteste\b/.test(text) || text.includes("em_reteste")) return "reteste";
  return detectReproductiveEventKind(text);
}

function addReproductionKindsFromText(target: Set<string>, value: unknown) {
  const text = normalizedText(value);
  if (!text) return;
  if (/\b(?:prenhas?|prenhes|prenhe|prenhez|gestantes?|gestacao)\b/.test(text)) target.add("prenhez");
  if (/\b(?:inseminad[ao]s?|inseminacao|ia|iatf)\b/.test(text)) target.add("inseminacao");
  if (/\b(?:paridas?|pariram|partos?|pariu|recem parida)\b/.test(text)) target.add("parto");
  if (/\bprotocolo\b/.test(text) || text.includes("em_protocolo")) target.add("protocolo");
  if (/\breteste\b/.test(text) || text.includes("em_reteste")) target.add("reteste");
  const detected = detectReproductiveEventKind(text);
  if (detected) target.add(detected);
}

function targetReproductionKinds(plan: QueryActionPlan) {
  const kinds = new Set<string>();
  for (const filter of plan.filters) {
    const values = Array.isArray(filter.value) ? filter.value : [filter.value];
    values.forEach((value) => addReproductionKindsFromText(kinds, value));
  }
  addReproductionKindsFromText(kinds, plan.operation || "");
  addReproductionKindsFromText(kinds, plan.semantic?.intent || "");
  addReproductionKindsFromText(kinds, plan.semantic?.operation || "");
  if (!kinds.size) {
    const kind = targetReproductionKind(plan);
    if (kind) kinds.add(kind);
  }
  const order = ["prenhez", "inseminacao", "parto", "protocolo", "reteste", "pre_parto", "cio", "aborto"];
  return order.filter((kind) => kinds.has(kind));
}

function temporalAnchorEventMatches(event: AnyRecord, sourceDomain: string, expectedEvent: string) {
  const expected = normalizedText(expectedEvent);
  if (!expected) return false;

  if (sourceDomain === "reproducao") {
    return queryEventKind(event) === expected;
  }

  return normalizedText([event.tipo, event.medicamento, event.descricao].filter(Boolean).join(" ")).includes(expected);
}

function temporalAnchorLabel(event: string) {
  const kind = normalizedText(event);
  if (["parto", "inseminacao", "protocolo", "reteste", "pre_parto", "prenhez", "cio", "aborto"].includes(kind)) {
    return reproductiveEventLabel(kind as Parameters<typeof reproductiveEventLabel>[0]).toLowerCase();
  }
  return String(event || "evento").trim().toLowerCase();
}

async function resolveTemporalAnchorPlan(
  input: ExecuteQueryActionPlanInput,
  plan: QueryActionPlan,
  domain: DomainManifestEntry
): Promise<{ ok: true; plan: QueryActionPlan } | { ok: false; reason: string; message: string }> {
  const anchor = plan.semantic?.temporalAnchor;
  if (!anchor || !input.supabase || !input.owner.fazenda_id) return { ok: true, plan };

  const sourceDomain = getDomainManifest(anchor.sourceDomain)?.domain;
  const expectedEvent = String(anchor.event || "").trim();
  const direction = String(anchor.direction || "after").trim().toLowerCase();
  const occurrence = String(anchor.occurrence || "latest").trim().toLowerCase();
  const animalFilter = plan.filters.find((filter) => filter.field === "animal_ref" && !isCollectiveAnimalRef(filter.value));

  if (!sourceDomain || !expectedEvent || !animalFilter) {
    return {
      ok: false,
      reason: "temporal_anchor_missing_scope",
      message: "Preciso saber qual animal deve ser usado como referencia para essa consulta."
    };
  }

  const [{ data: animalData, error: animalError }, { data: eventData, error: eventError }] = await Promise.all([
    input.supabase
      .from(TABLES.animais)
      .select("id,brinco,nome")
      .eq("fazenda_id", input.owner.fazenda_id)
      .limit(3000),
    input.supabase
      .from(TABLES.eventosAnimal)
      .select("id,animal_id,tipo,data_evento,descricao,medicamento,created_at")
      .eq("fazenda_id", input.owner.fazenda_id)
      .order("data_evento", { ascending: false })
      .limit(3000)
  ]);
  if (animalError) throw new Error(animalError.message);
  if (eventError) throw new Error(eventError.message);

  const animals = (animalData || []) as AnyRecord[];
  const matchingAnimals = animals.filter((animal) => referenceMatches([animal.brinco, animal.nome, animal.id].filter(Boolean), animalFilter.value));
  if (!matchingAnimals.length) {
    return {
      ok: false,
      reason: "temporal_anchor_animal_not_found",
      message: `Nao encontrei o animal ${String(animalFilter.value)} no rebanho.`
    };
  }

  const animalIds = new Set(matchingAnimals.map((animal) => String(animal.id)));
  const anchors = ((eventData || []) as AnyRecord[])
    .filter((event) => animalIds.has(String(event.animal_id || "")))
    .filter((event) => temporalAnchorEventMatches(event, sourceDomain, expectedEvent))
    .filter((event) => Boolean(parseDate(event.data_evento || event.created_at)))
    .sort((left, right) => String(right.data_evento || right.created_at || "").localeCompare(String(left.data_evento || left.created_at || "")));
  const selected = occurrence === "first" ? anchors[anchors.length - 1] : anchors[0];
  if (!selected) {
    return {
      ok: false,
      reason: "temporal_anchor_event_not_found",
      message: `Nao encontrei ${temporalAnchorLabel(expectedEvent)} registrada para ${animalLabel(matchingAnimals[0])}.`
    };
  }

  const anchorDate = parseDate(selected.data_evento || selected.created_at);
  if (!anchorDate) {
    return {
      ok: false,
      reason: "temporal_anchor_date_not_found",
      message: `O registro de ${temporalAnchorLabel(expectedEvent)} de ${animalLabel(matchingAnimals[0])} nao tem data para usar como referencia.`
    };
  }

  const dateField = domain.dateFields.includes("data") ? "data" : domain.dateFields[0];
  if (!dateField) return { ok: true, plan };
  const filter: FilterPlan = {
    field: dateField,
    op: direction === "before" ? "lte" : "gte",
    value: dateOnly(anchorDate)
  };

  return {
    ok: true,
    plan: {
      ...plan,
      filters: [...plan.filters, filter]
    }
  };
}

function reproductionSubject(plan: QueryActionPlan) {
  const category = plan.filters.find((filter) => filter.field === "categoria")?.value;
  return animalCategoryFromQueryText(category) === "vaca" ? "Vacas" : "Animais";
}

function reproductionTitle(kind?: string, subject = "Animais") {
  const cows = subject === "Vacas";
  if (kind === "prenhez") return `${subject} ${cows ? "prenhas" : "prenhes"}`;
  if (kind === "inseminacao") return `${subject} ${cows ? "inseminadas" : "inseminados"}`;
  if (kind === "parto") return `${subject} ${cows ? "paridas" : "com parto"}`;
  if (kind === "protocolo") return `${subject} em protocolo`;
  if (kind === "reteste") return `${subject} em reteste`;
  if (kind === "pre_parto") return `${subject} em pré-parto`;
  return "Eventos reprodutivos";
}

function reproductionTitleForKinds(kinds: string[], subject = "Animais") {
  if (kinds.length <= 1) return reproductionTitle(kinds[0], subject);
  const labels = kinds.map((kind) => reproductionTitle(kind, subject).replace(new RegExp(`^${subject}\\s+`, "i"), "").toLowerCase());
  return `${subject} ${labels.join(" e ")}`;
}

function emptyReproductionText(kind?: string) {
  if (kind === "prenhez") return "Não encontrei vacas prenhas registradas no momento.";
  if (kind === "inseminacao") return "Não encontrei vacas inseminadas registradas no momento.";
  if (kind === "parto") return "Não encontrei vacas paridas registradas no momento.";
  if (kind === "protocolo") return "Não encontrei vacas em protocolo registradas no momento.";
  if (kind === "reteste") return "Não encontrei vacas em reteste registradas no momento.";
  return "Não encontrei eventos reprodutivos para esse período.";
}

function emptyReproductionTextForKinds(kinds: string[], subject = "Animais") {
  if (kinds.length <= 1) return emptyReproductionText(kinds[0]);
  return `Não encontrei registros ativos para ${reproductionTitleForKinds(kinds, subject).toLowerCase()} no momento.`;
}

function reproductionAnimalMatches(animal: AnyRecord, plan: QueryActionPlan) {
  return plan.filters.every((filter) => {
    if (filter.field === "animal_ref") {
      const collectiveCategory = collectiveAnimalCategory(filter.value);
      if (collectiveCategory) return animalCategoryMatches(animal, collectiveCategory);
      const candidates = [animal.brinco, animal.nome, animal.id].filter(Boolean);
      if (filter.op === "in") {
        const values = Array.isArray(filter.value) ? filter.value : [filter.value];
        return values.some((value) => referenceMatches(candidates, value));
      }
      if (filter.op === "neq") return !referenceMatches(candidates, filter.value);
      return referenceMatches(candidates, filter.value);
    }
    if (filter.field === "categoria") {
      if (filter.op === "in") {
        const values = Array.isArray(filter.value) ? filter.value : [filter.value];
        return values.some((value) => animalCategoryMatches(animal, value));
      }
      if (filter.op === "neq") return !animalCategoryMatches(animal, filter.value);
      return animalCategoryMatches(animal, filter.value);
    }
    return true;
  });
}

function reproductionEventHistoryRequested(plan: QueryActionPlan, domain: DomainManifestEntry) {
  if (plan.filters.some((filter) => domain.dateFields.includes(filter.field))) return true;
  const descriptor = normalizedText([
    plan.operation,
    plan.semantic?.intent,
    plan.semantic?.operation,
    plan.semantic?.report?.type,
    plan.semantic?.report?.detailLevel
  ].filter(Boolean).join(" "));
  return /\b(?:historico|evento|listar|lista|registros|detalhado)\b/.test(descriptor);
}

/**
 * Prenhez, pre-parto, protocolo e reteste sao estados: duram e faz sentido
 * dizer "esta em X ha N dias". Parto, aborto, inseminacao e cio acontecem em
 * um instante. Tratar todos como estado produzia frases falsas, do tipo
 * "a vaca esta em parto ha 30 dias".
 */
const REPRODUCTION_POINT_EVENTS = new Set(["parto", "aborto", "inseminacao", "cio"]);

function isReproductionState(kind: unknown) {
  return !REPRODUCTION_POINT_EVENTS.has(String(kind || "").trim().toLowerCase());
}

function specificReproductionResponse(row: AnyRecord, animal: AnyRecord | undefined, kind: string | undefined, baseDate: Date) {
  const label = animalLabel(animal);
  const resolvedKind = kind || row.kind;
  const eventLabel = reproductiveEventLabel(resolvedKind as Parameters<typeof reproductiveEventLabel>[0]).toLowerCase();
  const date = row.data_evento ? shortDate(row.data_evento) : null;
  const days = row.data_evento ? daysSince(row.data_evento, baseDate) : null;
  const details = cleanReproductionDetail(row.descricao);

  if (days !== null && date) {
    const duration = `${days} ${days === 1 ? "dia" : "dias"}`;
    const base = isReproductionState(resolvedKind)
      ? `${label} está em ${eventLabel} há ${duration}, desde ${date}.`
      : `${label}: ${eventLabel} registrado em ${date}, há ${duration}.`;
    return details ? `${base}\n${details}` : base;
  }
  if (date) {
    const base = `${label}: ${eventLabel} registrado em ${date}.`;
    return details ? `${base}\n${details}` : base;
  }
  if (isReproductionState(resolvedKind)) {
    return `${label} está em ${eventLabel}, mas o registro não tem uma data para calcular a duração.`;
  }
  return `${label}: ${eventLabel} registrado, mas sem data no registro.`;
}

function cleanReproductionDetail(value: unknown) {
  const text = String(value || "").trim();
  if (!text || /^status atual do animal$/i.test(text)) return "";
  return text;
}

const ANIMAL_SEX_LABEL: Record<string, string> = {
  femea: "fêmea",
  macho: "macho"
};

function daysApart(left: unknown, right: unknown) {
  const start = new Date(String(left || "").slice(0, 10));
  const end = new Date(String(right || "").slice(0, 10));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return Math.abs(Math.round((end.getTime() - start.getTime()) / 86400000));
}

/**
 * Crias do parto. O evento guarda apenas a mae, entao a cria vem de animais
 * com mae_id apontando para ela. Quando a mae teve mais de um parto, usamos a
 * proximidade entre nascimento e data do evento para nao atribuir a cria
 * errada; sem data, so assumimos quando existe uma unica cria registrada.
 */
function calvesForBirthEvent(
  row: AnyRecord,
  calvesByMother: Map<string, AnyRecord[]>,
  animalsById: Map<string, AnyRecord>
) {
  if (String(row.kind || "").trim().toLowerCase() !== "parto") return [];
  const calves = calvesByMother.get(String(row.animal_id || "")) || [];
  if (!calves.length) return [];
  const near = row.data_evento
    ? calves.filter((calf) => {
        const distance = daysApart(calf.data_nascimento, row.data_evento);
        return distance !== null && distance <= 3;
      })
    : [];
  const chosen = near.length ? near : calves.length === 1 ? calves : [];
  return chosen.map((calf) => ({
    calf,
    father: calf.pai_id ? animalsById.get(String(calf.pai_id)) || null : null
  }));
}

function birthDetailLines(
  row: AnyRecord,
  calvesByMother: Map<string, AnyRecord[]>,
  animalsById: Map<string, AnyRecord>
) {
  return calvesForBirthEvent(row, calvesByMother, animalsById).map(({ calf, father }) => {
    const parts = [`Cria: ${animalLabel(calf)}`];
    const sex = ANIMAL_SEX_LABEL[String(calf.sexo || "").trim().toLowerCase()];
    if (sex) parts.push(`sexo ${sex}`);
    parts.push(father ? `pai ${animalLabel(father)}` : "pai não informado");
    return `${parts.join(", ")}.`;
  });
}

async function executeReproductionQuery(input: ExecuteQueryActionPlanInput, plan: QueryActionPlan, domain: DomainManifestEntry): Promise<ExecuteQueryActionPlanResult> {
  if (!input.supabase || !input.owner.fazenda_id) {
    return {
      ok: false,
      status: "blocked",
      reason: "missing_query_context",
      message: "Nao posso consultar sem contexto do rancho."
    };
  }

  const baseDate = currentDate(input.currentDate);
  const dateFilter = plan.filters.find((filter) => domain.dateFields.includes(filter.field));
  const range = dateFilter ? dateRangeFor(dateFilter, baseDate) : null;
  const kinds = targetReproductionKinds(plan);
  const kind = kinds.length === 1 ? kinds[0] : undefined;
  const hasGroupBy = Boolean(plan.groupBy?.length && plan.aggregations?.length);
  const hasAggregation = Boolean(plan.aggregations?.length);
  const eventHistory = hasGroupBy || hasAggregation || reproductionEventHistoryRequested(plan, domain);
  const limit = eventHistory || wantsDetailedList(plan)
    ? domain.maxLimit
    : Math.min(plan.limit || domain.maxLimit, domain.maxLimit);

  let query = input.supabase
    .from(TABLES.eventosAnimal)
    .select("id,animal_id,tipo,data_evento,descricao,medicamento,custo,created_at")
    .eq("fazenda_id", input.owner.fazenda_id)
    .order("data_evento", { ascending: false })
    .limit(3000);
  if (range) query = query.gte("data_evento", range.start.toISOString()).lt("data_evento", range.end.toISOString());

  const [{ data: eventData, error: eventError }, { data: animalData, error: animalError }] = await Promise.all([
    query,
    input.supabase
      .from(TABLES.animais)
      // mae_id, pai_id e data_nascimento sustentam o cruzamento de genealogia:
      // um parto sem a cria e o pai fica incompleto para o usuario.
      .select("id,brinco,nome,categoria,sexo,fase,status,mae_id,pai_id,data_nascimento")
      .eq("fazenda_id", input.owner.fazenda_id)
      .limit(3000)
  ]);
  if (eventError) throw new Error(eventError.message);
  if (animalError) throw new Error(animalError.message);

  const animals = (animalData || []) as AnyRecord[];
  const animalsById = new Map(animals.map((animal) => [String(animal.id), animal]));
  const matchingAnimals = animals.filter((animal) => reproductionAnimalMatches(animal, plan));
  const matchingAnimalIds = new Set(matchingAnimals.map((animal) => String(animal.id)));
  const hasAnimalScope = plan.filters.some((filter) => ["animal_ref", "categoria"].includes(filter.field));
  const specificAnimalFilter = plan.filters.find((filter) => filter.field === "animal_ref" && !isCollectiveAnimalRef(filter.value));
  const allEvents: AnyRecord[] = ((eventData || []) as AnyRecord[])
    .map((event): AnyRecord => ({ ...event, kind: queryEventKind(event) }))
    .filter((event): event is AnyRecord => Boolean(event.kind))
    .filter((event) => !hasAnimalScope || matchingAnimalIds.has(String(event.animal_id || "")))
    .sort((left: AnyRecord, right: AnyRecord) => String(right.data_evento || right.created_at || "").localeCompare(String(left.data_evento || left.created_at || "")));

  let rows: AnyRecord[];
  if (kinds.length) {
    if (eventHistory) {
      rows = allEvents.filter((event) => kinds.includes(String(event.kind || "")));
    } else {
      const eventsByAnimal = new Map<string, AnyRecord[]>();
      for (const event of allEvents) {
        const animalId = String(event.animal_id || "");
        if (!animalId) continue;
        eventsByAnimal.set(animalId, [...(eventsByAnimal.get(animalId) || []), event]);
      }
      rows = Array.from(eventsByAnimal.values())
        .flatMap((events) => kinds.map((item) => activeReproductionEventForKind(events, item)))
        .filter((event): event is AnyRecord => Boolean(event));
      if (kinds.includes("prenhez")) {
        const existing = new Set(rows.map((event) => String(event.animal_id || "")));
        for (const animal of matchingAnimals) {
          if (existing.has(String(animal.id))) continue;
          if (["gestante", "prenhe", "prenha"].includes(normalizedText(animal.fase))) {
            rows.push({ animal_id: animal.id, kind: "prenhez", tipo: "prenhez", data_evento: null, descricao: "Status atual do animal" });
          }
        }
      }
    }
  } else {
    rows = allEvents;
  }

  const seenRows = new Set<string>();
  rows = rows
    .filter((row) => {
      const key = [row.id || "", row.animal_id || "", row.kind || row.tipo || "", row.data_evento || ""].join(":");
      if (seenRows.has(key)) return false;
      seenRows.add(key);
      return true;
    });

  if (plan.groupBy?.length && plan.aggregations?.length) {
    const groupField = plan.groupBy[0];
    const isAnimalGroup = groupField === "animal_ref" || groupField === "animal_id";
    const grouped = new Map<string, AnyRecord[]>();
    for (const row of rows) {
      const key = isAnimalGroup ? String(row.animal_id || "") : String((row as AnyRecord)[groupField] ?? "");
      if (!key) continue;
      grouped.set(key, [...(grouped.get(key) || []), row]);
    }
    const agg = plan.aggregations[0];
    const metricKey = agg.as || `${agg.op}_${agg.field}`;
    let ranking = Array.from(grouped.entries()).map(([key, groupRows]) => {
      const metricValue = agg.op === "count" ? groupRows.length
        : agg.op === "sum" ? groupRows.reduce((s, r) => s + Number(r[agg.field] || 0), 0)
        : groupRows.length;
      const animal = isAnimalGroup ? animalsById.get(key) : undefined;
      return { key, label: animal ? animalLabel(animal) : key, value: metricValue, rows: groupRows };
    });
    const dir = plan.orderBy?.direction === "asc" ? 1 : -1;
    ranking.sort((a, b) => (a.value - b.value) * dir);
    const rankLimit = Math.min(plan.limit || 10, ranking.length);
    ranking = ranking.slice(0, rankLimit);
    const kindLabel = kind ? reproductiveEventLabel(kind as Parameters<typeof reproductiveEventLabel>[0]).toLowerCase() : "eventos";
    const lines = ranking.map((item, i) => `${i + 1}. ${item.label} — ${item.value} ${kindLabel}${item.value !== 1 ? "s" : ""}`);
    const title = rankLimit === 1 && ranking.length ? ranking[0].label : `Ranking por ${kindLabel}s`;
    const response = rankLimit === 1 && ranking.length
      ? `${ranking[0].label} é quem teve mais ${kindLabel}s: ${ranking[0].value} registrado${ranking[0].value !== 1 ? "s" : ""}.`
      : `${title}:\n${lines.join("\n")}`;
    const parsed = finalizeActionPlanParsed(QUERY_INTENT_BY_DOMAIN[domain.domain] || "CONSULTA_REGISTROS_HOJE", {
      consulta: true,
      action_plan_response: response,
      resultado: {
        registros: ranking.length,
        metrics: { [metricKey]: ranking[0]?.value ?? 0 },
        groups: ranking.map((item) => ({ label: item.label, values: { [groupField]: item.key }, metrics: { [metricKey]: item.value }, registros: item.rows.length })),
        filters: plan.filters
      }
    }, [], plan.confidence, plan, { interpreterFinal: "action_plan_query" });
    return { ok: true, parsed, response, rows };
  }

  if (!plan.groupBy?.length && plan.aggregations?.length) {
    const agg = plan.aggregations[0];
    const metricKey = agg.as || `${agg.op}_${agg.field}`;
    const total = agg.op === "count" ? rows.length
      : agg.op === "sum" ? rows.reduce((s, r) => s + Number(r[agg.field] || 0), 0)
      : rows.length;
    const kindLabel = kind ? reproductiveEventLabel(kind as Parameters<typeof reproductiveEventLabel>[0]).toLowerCase() : "evento";
    const animalFilter = plan.filters.find((f) => f.field === "animal_ref");
    const animalName = animalFilter ? String(animalFilter.value || "") : null;
    const targetAnimal = animalName && matchingAnimals.length === 1 ? animalLabel(matchingAnimals[0]) : animalName;
    const response = targetAnimal
      ? `${targetAnimal} teve ${total} ${kindLabel}${total !== 1 ? "s" : ""} registrada${total !== 1 ? "s" : ""}.`
      : `Total: ${total} ${kindLabel}${total !== 1 ? "s" : ""} registrado${total !== 1 ? "s" : ""}.`;
    const parsed = finalizeActionPlanParsed(QUERY_INTENT_BY_DOMAIN[domain.domain] || "CONSULTA_REGISTROS_HOJE", {
      consulta: true,
      action_plan_response: response,
      resultado: { registros: rows.length, metrics: { [metricKey]: total }, filters: plan.filters }
    }, [], plan.confidence, plan, { interpreterFinal: "action_plan_query" });
    return { ok: true, parsed, response, rows };
  }

  // A consulta chega ordenada da mais recente para a mais antiga. Sem honrar o
  // orderBy do plano, "os primeiros partos do ano" devolvia justamente os
  // ultimos, ou seja, a resposta errada com cara de certa.
  if (plan.orderBy?.direction === "asc") {
    rows = [...rows].sort((left, right) =>
      String(left.data_evento || "").localeCompare(String(right.data_evento || "")));
  }
  rows = rows.slice(0, limit);
  const calvesByMother = new Map<string, AnyRecord[]>();
  for (const animal of animals) {
    const motherId = String(animal.mae_id || "");
    if (!motherId) continue;
    const current = calvesByMother.get(motherId) || [];
    current.push(animal);
    calvesByMother.set(motherId, current);
  }

  const subject = reproductionSubject(plan);
  const title = eventHistory
    ? kinds.length === 1 && kind === "parto" ? `Partos registrados de ${subject.toLowerCase()}` : "Eventos reprodutivos registrados"
    : reproductionTitleForKinds(kinds, subject);
  const singleAnimal = specificAnimalFilter && matchingAnimals.length === 1 ? matchingAnimals[0] : undefined;
  const pageSize = Math.max(1, input.pagination?.pageSize || 12);
  const offset = Math.max(0, input.pagination?.offset || 0);
  const pageRows = rows.slice(offset, offset + pageSize);
  const nextOffset = offset + pageRows.length;
  const response = singleAnimal && rows.length === 1
    ? [
        specificReproductionResponse(rows[0], singleAnimal, kind, baseDate),
        ...birthDetailLines(rows[0], calvesByMother, animalsById)
      ].join("\n")
    : specificAnimalFilter && !matchingAnimals.length
      ? `Não encontrei o animal ${String(specificAnimalFilter.value || "informado")} no rebanho.`
    : rows.length
    ? [
        offset ? `Mais registros de ${title.toLowerCase()}:` : `${title}:`,
        ...pageRows.map((row, index) => {
          const animal = animalsById.get(String(row.animal_id || ""));
          const label = reproductiveEventLabel(row.kind).replace("Prenhez", "Prenha");
          const date = row.data_evento ? shortDate(row.data_evento) : "sem data";
          const days = row.data_evento ? daysSince(row.data_evento, baseDate) : null;
          const obs = row.descricao ? ` - ${row.descricao}` : "";
          const calves = birthDetailLines(row, calvesByMother, animalsById);
          const calfText = calves.length ? `\n   ${calves.join("\n   ")}` : "";
          return `${offset + index + 1}. ${animalLabel(animal)} - ${label} - ${date}${days !== null ? ` (${days} dias)` : ""}${obs}${calfText}`;
        }),
        nextOffset < rows.length ? `...e mais ${rows.length - nextOffset} registro(s). Responda "mostrar mais" para continuar.` : offset ? "Fim da lista." : ""
      ].filter(Boolean).join("\n")
    : specificAnimalFilter && matchingAnimals.length === 1 && kind
      ? `${animalLabel(matchingAnimals[0])} não está em ${reproductiveEventLabel(kind as Parameters<typeof reproductiveEventLabel>[0]).toLowerCase()} no momento.`
      : emptyReproductionTextForKinds(kinds, subject);

  const parsed = finalizeActionPlanParsed(QUERY_INTENT_BY_DOMAIN[domain.domain] || "CONSULTA_REGISTROS_HOJE", {
    consulta: true,
    action_plan_response: response,
    resultado: {
      registros: rows.length,
      tipo_reprodutivo: kinds.length > 1 ? kinds : kind || null,
      filters: plan.filters,
      // Dados da pagina para o compositor redigir sem depender do template.
      linhas_pagina: pageRows.map((row) => {
        const animal = animalsById.get(String(row.animal_id || ""));
        const calves = calvesForBirthEvent(row, calvesByMother, animalsById);
        return {
          animal: animalLabel(animal),
          evento: reproductiveEventLabel(row.kind),
          e_estado: isReproductionState(row.kind),
          data: row.data_evento || null,
          dias: row.data_evento ? daysSince(row.data_evento, baseDate) : null,
          observacoes: cleanReproductionDetail(row.descricao) || null,
          crias: calves.map(({ calf, father }) => ({
            cria: animalLabel(calf),
            sexo: ANIMAL_SEX_LABEL[String(calf.sexo || "").trim().toLowerCase()] || null,
            pai: father ? animalLabel(father) : null
          }))
        };
      }),
      pagina: { offset, pageSize, total: rows.length }
    }
  }, [], plan.confidence, plan, { interpreterFinal: "action_plan_query" });

  if (parsed.dados) {
    parsed.dados.action_plan_pagination = singleAnimal
      ? undefined
      : nextQueryPagination(domain.domain, plan, input.currentDate, rows.length, offset, pageSize);
  }

  return { ok: true, parsed, response, rows };
}

async function executeStockQuery(input: ExecuteQueryActionPlanInput, plan: QueryActionPlan, domain: DomainManifestEntry): Promise<ExecuteQueryActionPlanResult> {
  if (!input.supabase || !input.owner.fazenda_id) {
    return {
      ok: false,
      status: "blocked",
      reason: "missing_query_context",
      message: "Nao posso consultar sem contexto do rancho."
    };
  }

  const itemFilter = plan.filters.find((filter) => ["item", "nome"].includes(filter.field));
  /**
   * "Quando foi a ultima movimentacao" nao tem filtro nenhum: o pedido vem em
   * orderBy por data e em operation=consultar_historico_estoque. Olhar so os
   * filtros mandava a pergunta para a lista de itens, que era cortada pelo
   * limit e devolvia o primeiro item da ordem do banco, justamente o mais
   * antigo. Ordenacao por data e operacao de historico tambem sao pedido de
   * movimentacao.
   */
  const ordersByDate = Boolean(plan.orderBy && domain.dateFields.includes(plan.orderBy.field));
  const historyOperation = /\b(?:historico|movimenta|ultima|ultimo)\b/.test(
    normalizedText([plan.operation, plan.semantic?.operation, plan.semantic?.intent].filter(Boolean).join(" "))
  );
  const movementFilter = plan.filters.some((filter) => ["data", "tipo_movimento", "tipo"].includes(filter.field))
    || ordersByDate
    || historyOperation;
  const itemText = itemFilter ? normalizedText(itemFilter.value) : "";
  const [{ data: itemData, error: itemError }, { data: movementData, error: movementError }] = await Promise.all([
    input.supabase
      .from(TABLES.estoqueItens)
      .select("id,nome,categoria,unidade_medida,quantidade_atual,quantidade_minima,ativo,created_at")
      .eq("fazenda_id", input.owner.fazenda_id)
      .limit(1000),
    input.supabase
      .from(TABLES.estoqueMovimentacoes)
      .select("id,item_id,tipo,quantidade,valor_unitario,motivo,created_at")
      .eq("fazenda_id", input.owner.fazenda_id)
      .order("created_at", { ascending: false })
      .limit(1000)
  ]);
  if (itemError) throw new Error(itemError.message);
  if (movementError) throw new Error(movementError.message);

  const movements = (movementData || []) as AnyRecord[];
  const items = ((itemData || []) as AnyRecord[])
    .filter((item) => item.ativo !== false)
    .filter((item) => !itemText || normalizedText([item.nome, item.categoria].filter(Boolean).join(" ")).includes(itemText));
  const itemById = new Map(items.map((item) => [String(item.id), item]));
  const latestMovementByItem = new Map<string, AnyRecord>();
  for (const movement of movements) {
    const key = String(movement.item_id || "");
    if (key && !latestMovementByItem.has(key)) latestMovementByItem.set(key, movement);
  }

  let rows = items;
  if (movementFilter) {
    const baseDate = currentDate(input.currentDate);
    const filteredMovements = movements.filter((movement) => {
      if (itemText && !itemById.has(String(movement.item_id || ""))) return false;
      return plan.filters.every((filter) => {
        if (["item", "nome"].includes(filter.field)) return true;
        if (filter.field === "tipo_movimento" || filter.field === "tipo") return normalizedText(movement.tipo) === normalizedText(filter.value);
        if (filter.field === "data") {
          const range = dateRangeFor(filter, baseDate);
          const parsed = parseDate(movement.created_at);
          return !range || (parsed ? parsed >= range.start && parsed < range.end : false);
        }
        return true;
      });
    });
    // A consulta ja vem ordenada da mais recente para a mais antiga. Se o plano
    // pedir ascendente, invertemos; e o limit do usuario passa a valer, para
    // "a ultima movimentacao" devolver uma, e a certa.
    const orderedMovements = plan.orderBy?.direction === "asc"
      ? [...filteredMovements].reverse()
      : filteredMovements;
    const movementLimit = Math.min(plan.limit || domain.maxLimit, domain.maxLimit);
    const rows = orderedMovements.slice(0, movementLimit);
    const pageSize = Math.max(1, input.pagination?.pageSize || 10);
    const offset = Math.max(0, input.pagination?.offset || 0);
    const shownMovements = rows.slice(offset, offset + pageSize);
    const nextOffset = offset + shownMovements.length;
    const response = shownMovements.length
      ? [
          shownMovements.length === 1 ? "Última movimentação de estoque:" : "Movimentações de estoque:",
          ...shownMovements.map((movement, index) => {
            const item = itemById.get(String(movement.item_id || "")) || ((itemData || []) as AnyRecord[]).find((row) => String(row.id) === String(movement.item_id));
            const detail = movement.motivo ? ` - ${movement.motivo}` : "";
            return `${offset + index + 1}. ${shortDate(movement.created_at)} - ${item?.nome || "Item"} - ${movement.tipo || "movimento"} de ${stockAmount(movement.quantidade, item?.unidade_medida)}${detail}`;
          }),
          nextOffset < rows.length
            ? `...e mais ${rows.length - nextOffset} movimentações. Responda "mostrar mais" para continuar.`
            : offset ? "Fim da lista." : ""
        ].filter(Boolean).join("\n")
      : "Não encontrei movimentações de estoque para esse período.";
    const parsed = finalizeActionPlanParsed("CONSULTA_ESTOQUE_GERAL", {
      consulta: true,
      action_plan_response: response,
      resultado: {
        registros: rows.length,
        filters: plan.filters,
        linhas_pagina: shownMovements.map((movement) => {
          const item = itemById.get(String(movement.item_id || ""));
          return {
            data: shortDate(movement.created_at),
            item: item?.nome || null,
            tipo: movement.tipo || null,
            quantidade: stockAmount(movement.quantidade, item?.unidade_medida),
            motivo: movement.motivo || null
          };
        }),
        pagina: { offset, pageSize, total: rows.length }
      }
    }, [], plan.confidence, plan, { interpreterFinal: "action_plan_query" });
    if (parsed.dados) parsed.dados.action_plan_pagination = nextQueryPagination(domain.domain, plan, input.currentDate, rows.length, offset, pageSize);
    return { ok: true, parsed, response, rows };
  }

  rows = rows.slice(0, Math.min(plan.limit || domain.maxLimit, domain.maxLimit));
  const pageSize = Math.max(1, input.pagination?.pageSize || 10);
  const offset = Math.max(0, input.pagination?.offset || 0);
  const pageRows = rows.slice(offset, offset + pageSize);
  const nextOffset = offset + pageRows.length;
  const response = pageRows.length
    ? [
        itemText ? `Estoque de ${rows[0]?.nome || itemFilter?.value}:` : offset ? "Mais itens de estoque:" : "Estoque atual:",
        ...pageRows.map((item, index) => {
          const latest = latestMovementByItem.get(String(item.id));
          const min = item.quantidade_minima !== undefined && item.quantidade_minima !== null ? `; mínimo ${stockAmount(item.quantidade_minima, item.unidade_medida)}` : "";
          const alert = Number(item.quantidade_minima || 0) > 0 && Number(item.quantidade_atual || 0) <= Number(item.quantidade_minima || 0) ? " Atenção: abaixo do mínimo." : "";
          return `${offset + index + 1}. ${item.nome}: ${stockAmount(item.quantidade_atual, item.unidade_medida)}${min}${latest ? `; última movimentação ${shortDate(latest.created_at)}` : ""}.${alert}`;
        }),
        nextOffset < rows.length ? `...e mais ${rows.length - nextOffset} item(ns). Responda "mostrar mais" para continuar.` : offset ? "Fim da lista." : ""
      ].filter(Boolean).join("\n")
    : itemText ? `Não encontrei ${itemFilter?.value || "esse item"} no estoque deste rancho.` : "Não encontrei itens de estoque cadastrados.";
  const parsed = finalizeActionPlanParsed("CONSULTA_ESTOQUE_GERAL", {
    consulta: true,
    action_plan_response: response,
    resultado: {
      registros: rows.length,
      filters: plan.filters,
      linhas_pagina: pageRows.map((item) => sanitizeRowForUser(item, { itemsById: itemById })),
      pagina: { offset, pageSize, total: rows.length }
    }
  }, [], plan.confidence, plan, { interpreterFinal: "action_plan_query" });

  if (parsed.dados) parsed.dados.action_plan_pagination = nextQueryPagination(domain.domain, plan, input.currentDate, rows.length, offset, pageSize);

  return { ok: true, parsed, response, rows };
}

function periodText(plan: QueryActionPlan) {
  const filter = plan.filters.find((item) => ["last_months", "last_days", "previous_month", "current_month", "current_week", "current_year", "since", "between", "gte", "lte"].includes(item.op));
  if (!filter) return "";
  if (filter.op === "last_months") return `dos últimos ${filter.value} meses`;
  if (filter.op === "last_days") return `dos últimos ${filter.value} dias`;
  if (filter.op === "previous_month") return "do mês anterior";
  if (filter.op === "current_month") return "do mês atual";
  if (filter.op === "current_week") return "desta semana";
  if (filter.op === "current_year") return "do ano atual";
  if (filter.op === "since") {
    const monthName = monthNameFromText(filter.value);
    if (monthName && !isOpenEndedSinceText(filter.value)) return `em ${monthName}`;
    return `desde ${filter.value}`;
  }
  if (filter.op === "between") {
    const raw = filter.value as AnyRecord | unknown[];
    const monthName = !Array.isArray(raw) && raw?.month ? monthNameFromText(raw.month) : "";
    if (monthName) return `em ${monthName}`;
    return "do período informado";
  }
  if (filter.op === "gte") return `desde ${shortDate(filter.value)}`;
  if (filter.op === "lte") return `ate ${shortDate(filter.value)}`;
  return "";
}

function employeeLabel(row?: AnyRecord | null) {
  if (!row) return "Funcionario";
  const name = String(row.nome || "").trim();
  const role = String(row.funcao || "").trim();
  return [name || String(row.id || "Funcionario"), role].filter(Boolean).join(" - ");
}

function employeeStatus(row: AnyRecord) {
  return row.ativo === false || row.deleted_at ? "inativo" : "ativo";
}

function employeeSalary(row: AnyRecord) {
  const salary = Number(row.salario_base);
  return Number.isFinite(salary) && salary > 0 ? money(salary) : "nao informado";
}

function employeeContact(row: AnyRecord) {
  const contact = String(row.contato_whatsapp || "").trim();
  return contact || "nao informado";
}

function employeeDetailLine(row: AnyRecord, index: number) {
  const parts = [
    `${index + 1}. ${employeeLabel(row)}`,
    employeeStatus(row),
    `admissao ${row.data_admissao ? shortDate(row.data_admissao) : "nao informada"}`,
    `salario ${employeeSalary(row)}`,
    `WhatsApp ${employeeContact(row)}`
  ];
  return parts.join(" - ");
}

function buildEmployeeResponse(rows: AnyRecord[], plan: QueryActionPlan, offset = 0, pageSize = 10) {
  const specificEmployee = plan.filters.some((filter) => filter.field === "funcionario_ref");
  if (!rows.length) return specificEmployee ? "Nao encontrei esse funcionario." : "Nao encontrei funcionarios cadastrados.";

  if (specificEmployee && rows.length === 1) {
    const employee = rows[0];
    return [
      `Dados de ${employee.nome || "funcionario"}:`,
      `Funcao: ${employee.funcao || "nao informada"}.`,
      `Status: ${employeeStatus(employee)}.`,
      employee.data_admissao ? `Admissao: ${shortDate(employee.data_admissao)}.` : "Admissao: nao informada.",
      `Salario: ${employeeSalary(employee)}.`,
      `WhatsApp: ${employeeContact(employee)}.`
    ].join("\n");
  }

  const active = rows.filter((row) => employeeStatus(row) === "ativo").length;
  const inactive = rows.length - active;
  const roles = countByText(rows, (row) => row.funcao || "sem funcao");
  const pageRows = rows.slice(offset, offset + pageSize);
  const sample = pageRows.map((row, index) => employeeDetailLine(row, offset + index));
  if (offset) {
    const nextOffset = offset + pageRows.length;
    return [
      "Mais funcionários:",
      ...sample,
      nextOffset < rows.length ? `...e mais ${rows.length - nextOffset} funcionário(s). Responda "mostrar mais" para continuar.` : "Fim da lista."
    ].join("\n");
  }
  return [
    "Dados dos funcionarios:",
    `Total encontrado: ${rows.length}.`,
    `Ativos: ${active}.`,
    inactive ? `Inativos: ${inactive}.` : "",
    `Funcoes: ${roles || "sem dados"}.`,
    "",
    "Lista:",
    ...sample,
    rows.length > sample.length ? `...e mais ${rows.length - sample.length} funcionário(s). Responda "mostrar mais" para continuar.` : ""
  ].filter(Boolean).join("\n");
}

function pointTime(value: unknown) {
  const text = String(value || "");
  const match = text.match(/[T\s](\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : shortDate(value);
}

function buildPointResponse(
  rows: AnyRecord[],
  plan: QueryActionPlan,
  relations: AnyRecord,
  offset = 0,
  pageSize = 10
) {
  const period = periodText(plan) || "de hoje";
  const specificEmployee = plan.filters.some((filter) => filter.field === "funcionario_ref");
  if (!rows.length) return specificEmployee ? `Nao encontrei ponto registrado ${period} para esse funcionario.` : `Nao encontrei ponto registrado ${period}.`;

  const entries = rows.filter((row) => normalizedText(row.tipo) === "entrada").length;
  const exits = rows.filter((row) => normalizedText(row.tipo) === "saida").length;
  const grouped = new Map<string, AnyRecord[]>();
  for (const row of rows) {
    const key = String(row.funcionario_id || "sem_funcionario");
    grouped.set(key, [...(grouped.get(key) || []), row]);
  }

  const employeeLines = Array.from(grouped.entries()).map(([employeeId, employeeRows], index) => {
    const employee = relations.employeesById?.get(employeeId);
    const label = employee?.nome || employeeId || "Funcionario";
    const parts = employeeRows
      .slice()
      .sort((left, right) => String(left.registrado_em || "").localeCompare(String(right.registrado_em || "")))
      .map((row) => `${row.tipo || "registro"} ${pointTime(row.registrado_em)}`)
      .join(", ");
    return `${index + 1}. ${label}: ${parts}`;
  });
  const pageLines = employeeLines.slice(offset, offset + pageSize);
  const nextOffset = offset + pageLines.length;

  return [
    offset ? `Mais registros de ponto ${period}:` : `Ponto ${period}:`,
    `Registros: ${rows.length}.`,
    `Entradas: ${entries}.`,
    `Saidas: ${exits}.`,
    "",
    specificEmployee ? "Registros:" : "Funcionarios com ponto:",
    ...pageLines,
    nextOffset < employeeLines.length ? `...e mais ${employeeLines.length - nextOffset} funcionario(s). Responda "mostrar mais" para continuar.` : offset ? "Fim da lista." : ""
  ].filter(Boolean).join("\n");
}

function querySample(domain: DomainManifestEntry, rows: AnyRecord[], relations: AnyRecord) {
  if (domain.domain === "animais") {
    return rows.slice(0, 12).map((row) => ({
      brinco: row.brinco || null,
      nome: row.nome || null,
      categoria: row.categoria || null,
      status: row.status || null,
      fase: row.fase || null
    }));
  }
  if (domain.domain === "financeiro") {
    return rows.slice(0, 12).map((row) => ({
      data: row.data_transacao || row.created_at || null,
      tipo: normalizeFinanceType(row.tipo),
      valor: Number(row.valor || 0),
      descricao: row.descricao || null,
      categoria: row.categoria || null
    }));
  }
  if (domain.domain === "funcionarios") {
    return rows.slice(0, 12).map((row) => ({
      nome: row.nome || null,
      funcao: row.funcao || null,
      data_admissao: row.data_admissao || null,
      salario_base: row.salario_base ?? null,
      contato_whatsapp: row.contato_whatsapp || null,
      ativo: row.ativo !== false
    }));
  }
  if (domain.domain === "ponto_funcionario") {
    return rows.slice(0, 12).map((row) => {
      const employee = relations.employeesById?.get(String(row.funcionario_id || ""));
      return {
        funcionario: employee?.nome || null,
        tipo: row.tipo || null,
        registrado_em: row.registrado_em || null
      };
    });
  }
  if (domain.domain === "genealogia") {
    return rows.slice(0, 12).map((row) => ({
      animal: animalLabel(row),
      pai: row.pai_id ? animalLabel(relations.animalsById?.get(String(row.pai_id))) : null,
      mae: row.mae_id ? animalLabel(relations.animalsById?.get(String(row.mae_id))) : null,
      data_nascimento: row.data_nascimento || null
    }));
  }
  // Dominio sem tratamento proprio: limpa a linha crua em vez de despejar
  // UUID e ISO no que o usuario le.
  return rows.slice(0, 12).map((row) => sanitizeRowForUser(row, relations));
}

function queryDetailLevel(plan: QueryActionPlan) {
  return normalizedText([
    plan.operation,
    plan.semantic?.operation,
    plan.semantic?.report?.type,
    plan.semantic?.report?.detailLevel
  ].filter(Boolean).join(" "));
}

function wantsDetailedList(plan: QueryActionPlan) {
  return /\b(?:lista|listar|listagem|detalhado|detalhada|detalhes|completo|completa|transacoes|movimentacoes|registros)\b/.test(queryDetailLevel(plan));
}

function financeDetailPlan(plan: QueryActionPlan): QueryActionPlan {
  return {
    ...plan,
    operation: "listar",
    semantic: {
      ...(plan.semantic || {}),
      operation: "listar",
      report: {
        ...(plan.semantic?.report || {}),
        type: "transacoes",
        detailLevel: "detalhado"
      }
    }
  };
}

function financeLine(row: AnyRecord, index: number) {
  const type = normalizeFinanceType(row.tipo) === "saida" ? "Saída" : "Entrada";
  const description = row.descricao || row.categoria || "sem descrição";
  return `${index}. ${shortDate(row.data_transacao || row.created_at)} - ${type} - ${description}: ${money(Number(row.valor || 0))}`;
}

function buildFinanceDetailedResponse(rows: AnyRecord[], plan: QueryActionPlan, offset = 0, pageSize = 10) {
  const pageRows = rows.slice(offset, offset + pageSize);
  const period = periodText(plan);
  if (!pageRows.length) return "Não há mais transações para mostrar.";
  const title = offset
    ? `Mais ${pageRows.length} transações financeiras:`
    : `Transações financeiras${period ? ` ${period}` : ""}:`;
  const nextOffset = offset + pageRows.length;
  return [
    title,
    ...pageRows.map((row, index) => financeLine(row, offset + index + 1)),
    nextOffset < rows.length ? `...e mais ${rows.length - nextOffset} transação(ões). Responda "mostrar mais" para continuar.` : "Fim da lista."
  ].join("\n");
}

function buildGenealogyResponse(rows: AnyRecord[], plan: QueryActionPlan, relations: AnyRecord, offset = 0, pageSize = 10) {
  const fatherFilter = plan.filters.find((filter) => filter.field === "pai_ref");
  const motherFilter = plan.filters.find((filter) => filter.field === "mae_ref");
  const childFilter = plan.filters.find((filter) => ["animal_ref", "filho_ref"].includes(filter.field));
  const parentFilter = fatherFilter || motherFilter;
  const pageRows = rows.slice(offset, offset + pageSize);

  if (!rows.length) {
    if (parentFilter) return `Não encontrei crias vinculadas a ${String(parentFilter.value || "esse animal")}.`;
    return childFilter
      ? `Não encontrei a genealogia de ${String(childFilter.value || "esse animal")}.`
      : "Não encontrei registros de genealogia no rebanho.";
  }

  if (childFilter && rows.length === 1) {
    const animal = rows[0];
    const father = animal.pai_id ? relations.animalsById?.get(String(animal.pai_id)) : null;
    const mother = animal.mae_id ? relations.animalsById?.get(String(animal.mae_id)) : null;
    return [
      `Genealogia de ${animalLabel(animal)}:`,
      `Pai: ${father ? animalLabel(father) : "não informado"}.`,
      `Mãe: ${mother ? animalLabel(mother) : "não informada"}.`
    ].join("\n");
  }

  const title = parentFilter
    ? `${offset ? "Mais crias" : "Crias"} de ${String(parentFilter.value)}:`
    : offset ? "Mais animais com genealogia:" : "Genealogia do rebanho:";
  const nextOffset = offset + pageRows.length;
  return [
    title,
    ...pageRows.map((row, index) => {
      const father = row.pai_id ? relations.animalsById?.get(String(row.pai_id)) : null;
      const mother = row.mae_id ? relations.animalsById?.get(String(row.mae_id)) : null;
      const parents = [father ? `pai ${animalLabel(father)}` : "", mother ? `mãe ${animalLabel(mother)}` : ""].filter(Boolean).join(", ");
      return `${offset + index + 1}. ${animalLabel(row)}${parents ? ` - ${parents}` : ""}`;
    }),
    nextOffset < rows.length ? `...e mais ${rows.length - nextOffset} registro(s). Responda "mostrar mais" para continuar.` : ""
  ].filter(Boolean).join("\n");
}

function productionTotal(rows: AnyRecord[]) {
  return rows.reduce((sum, row) => sum + Number(row.litros || 0), 0);
}

function productionLine(row: AnyRecord, index: number, relations: AnyRecord) {
  const animal = relations.animalsById?.get(String(row.animal_id || ""));
  const details = [
    `${index}. ${shortDate(row.ordenhado_em || row.created_at)} - ${animal ? animalLabel(animal) : "Animal não identificado"}`,
    `${numberText(Number(row.litros || 0))} litros`,
    row.turno ? `turno ${row.turno}` : "",
    row.destino ? `destino ${row.destino}` : ""
  ].filter(Boolean);
  return details.join(" - ");
}

function buildProductionDetailedResponse(
  rows: AnyRecord[],
  plan: QueryActionPlan,
  relations: AnyRecord,
  offset = 0,
  pageSize = 10
) {
  const period = periodText(plan);
  const pageRows = rows.slice(offset, offset + pageSize);
  if (!pageRows.length) return "Não há mais registros de produção de leite para mostrar.";

  const nextOffset = offset + pageRows.length;
  const title = offset
    ? `Mais registros de produção de leite${period ? ` ${period}` : ""}:`
    : `Registros de produção de leite${period ? ` ${period}` : ""}:`;
  const total = productionTotal(rows);

  return [
    title,
    ...pageRows.map((row, index) => productionLine(row, offset + index + 1, relations)),
    "",
    `Registros no período: ${rows.length}.`,
    `Total no período: ${numberText(total)} litros.`,
    nextOffset < rows.length ? `...e mais ${rows.length - nextOffset} registro(s). Responda "mostrar mais" para continuar.` : "Fim da lista."
  ].join("\n");
}

function buildProductionResponse(
  rows: AnyRecord[],
  metrics: AnyRecord,
  plan: QueryActionPlan,
  relations: AnyRecord,
  pagination?: { offset: number; pageSize: number }
) {
  const period = periodText(plan);
  const groups = Array.isArray(metrics.groups) ? [...metrics.groups] as AnyRecord[] : [];
  if (plan.groupBy?.includes("animal_ref")) {
    const aggregation = plan.aggregations?.find((item) => item.field === "litros") || plan.aggregations?.[0];
    const metricKey = aggregation ? aggregationMetricKey(aggregation) : "total_litros";
    const direction = plan.orderBy?.direction === "asc" ? "asc" : "desc";
    groups.sort((left, right) => {
      const difference = Number(left.metrics?.[metricKey] || 0) - Number(right.metrics?.[metricKey] || 0);
      return direction === "asc" ? difference : -difference;
    });
    if (!groups.length) return `Não encontrei produção de leite registrada${period ? ` ${period}` : ""}.`;

    const requested = Math.max(1, Math.min(plan.limit || groups.length, 12));
    const selected = groups.slice(0, requested);
    if (requested === 1) {
      const top = selected[0];
      const title = direction === "asc" ? "Menor produção de leite" : "Maior produção de leite";
      return `${title}${period ? ` ${period}` : ""}: ${top.label}, com ${numberText(Number(top.metrics?.[metricKey] || 0))} litros.`;
    }

    const title = direction === "asc" ? "Ranking de menor produção de leite" : "Ranking de produção de leite";
    return [
      `${title}${period ? ` ${period}` : ""}:`,
      ...selected.map((group, index) => `${index + 1}. ${group.label}: ${numberText(Number(group.metrics?.[metricKey] || 0))} litros.`),
      groups.length > selected.length ? `...e mais ${groups.length - selected.length} animal(is).` : ""
    ].filter(Boolean).join("\n");
  }

  if (wantsDetailedList(plan) || pagination?.offset) {
    return buildProductionDetailedResponse(rows, plan, relations, pagination?.offset || 0, pagination?.pageSize || 10);
  }

  // O total de uma consulta de produção é uma propriedade das linhas já
  // filtradas. A agregação do plano só complementa a consulta, nunca deve
  // decidir se a soma exibida existe ou não.
  const total = productionTotal(rows);
  const average = rows.length ? total / rows.length : 0;
  const animal = plan.filters.find((filter) => filter.field === "animal_ref")?.value;
  return [
    `Produção de leite${animal ? ` da ${animal}` : ""}:`,
    `Registros: ${rows.length}.`,
    `Total: ${numberText(total)} litros.`,
    `Média por registro: ${numberText(average)} litros.`
  ].join("\n");
}

function animalSelectedFieldLines(animal: AnyRecord, plan: QueryActionPlan, relations: AnyRecord) {
  const selected = Array.from(new Set((plan.select || []).filter((field) => field !== "id")));
  if (!selected.length) return [];

  const lot = relations.lotsById?.get(String(animal.lote_id || ""))?.nome;
  const father = animal.pai_id ? animalLabel(relations.animalsById?.get(String(animal.pai_id))) : null;
  const mother = animal.mae_id ? animalLabel(relations.animalsById?.get(String(animal.mae_id))) : null;
  const values: Record<string, string> = {
    brinco: `Brinco: ${animal.brinco || "nao informado"}.`,
    nome: `Nome: ${animal.nome || "nao informado"}.`,
    categoria: `Categoria: ${animal.categoria || "sem categoria"}.`,
    sexo: `Sexo: ${animal.sexo || "nao informado"}.`,
    fase: `Fase: ${animal.fase || "sem fase"}.`,
    raca: `Raca: ${animal.raca || "sem registro"}.`,
    lote_ref: `Lote: ${lot || "sem lote informado"}.`,
    lote_id: `Lote: ${lot || "sem lote informado"}.`,
    data_nascimento: `Data de nascimento: ${animal.data_nascimento ? shortDate(animal.data_nascimento) : "sem registro"}.`,
    peso: `Peso: ${animal.peso === undefined || animal.peso === null ? "sem registro" : `${numberText(Number(animal.peso))} kg`}.`,
    status: `Status: ${animal.status || "ativo"}.`,
    observacoes: `Observacoes: ${animal.observacoes || "sem registros"}.`,
    pai_ref: `Pai: ${father || "nao informado"}.`,
    mae_ref: `Mae: ${mother || "nao informada"}.`
  };
  return selected.map((field) => values[field]).filter(Boolean);
}

function buildResponse(
  domain: DomainManifestEntry,
  rows: AnyRecord[],
  metrics: AnyRecord,
  plan: QueryActionPlan,
  relations: AnyRecord,
  pagination?: { offset: number; pageSize: number }
) {
  if (metrics.groups?.length && plan.groupBy?.length && plan.aggregations?.length) {
    const groups = metrics.groups as AnyRecord[];
    const agg = plan.aggregations[0];
    const metricKey = agg.as || `${agg.op}_${agg.field}`;
    const dir = plan.orderBy?.direction === "asc" ? 1 : -1;
    const sorted = [...groups].sort((a, b) => (Number(a.metrics?.[metricKey] || 0) - Number(b.metrics?.[metricKey] || 0)) * dir);
    const limited = sorted.slice(0, plan.limit || sorted.length);
    if (limited.length === 1 && plan.limit === 1) {
      const top = limited[0];
      const val = Number(top.metrics?.[metricKey] || 0);
      const label = resolveGroupLabel(top, plan, relations);
      const unit = metricKey.replace(/^total_/, "");
      return `${label}: ${domain.domain === "financeiro" ? money(val) : numberText(val)} ${unit}.`;
    }
    const lines = limited.map((group, i) => {
      const val = Number(group.metrics?.[metricKey] || 0);
      const label = resolveGroupLabel(group, plan, relations);
      return `${i + 1}. ${label} — ${domain.domain === "financeiro" ? money(val) : numberText(val)}`;
    });
    const period = periodText(plan);
    const title = plan.limit === 1 ? "Resultado" : `Ranking${period ? ` ${period}` : ""}`;
    return `${title}:\n${lines.join("\n")}`;
  }

  if (metrics.totals && plan.aggregations?.length && !plan.groupBy?.length && !["financeiro"].includes(domain.domain)) {
    const agg = plan.aggregations[0];
    const metricKey = agg.as || `${agg.op}_${agg.field}`;
    const val = Number(metrics.totals[metricKey] || 0);
    const period = periodText(plan);
    return `Total${period ? ` ${period}` : ""}: ${numberText(val)}.`;
  }

  if (domain.domain === "fazenda") {
    const fazenda = rows[0];
    if (!fazenda) return "Não encontrei os dados do seu rancho.";

    const selected = new Set(plan.select || []);
    const nameOnly = selected.size === 0 || (selected.size === 1 && selected.has("nome"));
    if (nameOnly) return `O nome do seu rancho é ${fazenda.nome || "não informado"}.`;

    const location = [fazenda.cidade, fazenda.estado].filter(Boolean).join(" - ");
    return [
      `Rancho: ${fazenda.nome || "nome não informado"}.`,
      selected.has("cidade") || selected.has("estado") ? `Localização: ${location || "não informada"}.` : "",
      selected.has("responsavel") ? `Responsável: ${fazenda.responsavel || "não informado"}.` : "",
      selected.has("descricao") ? `Descrição: ${fazenda.descricao || "não informada"}.` : ""
    ].filter(Boolean).join("\n");
  }

  if (domain.domain === "financeiro") {
    if (wantsDetailedList(plan) || pagination?.offset) {
      return buildFinanceDetailedResponse(rows, plan, pagination?.offset || 0, pagination?.pageSize || 10);
    }
    const entradas = rows.filter((row) => normalizeFinanceType(row.tipo) === "entrada").reduce((sum, row) => sum + Number(row.valor || 0), 0);
    const saidas = rows.filter((row) => normalizeFinanceType(row.tipo) === "saida").reduce((sum, row) => sum + Number(row.valor || 0), 0);
    const total = Number(Object.values(metrics.totals || {})[0] || entradas + saidas);
    const period = periodText(plan);
    const search = plan.filters.find((filter) => ["descricao", "categoria"].includes(filter.field) && String(filter.value || "").trim())?.value;
    const typeFilter = plan.filters.find((filter) => filter.field === "tipo");
    const financeType = typeFilter ? normalizeFinanceType(typeFilter.value) : "";
    if (financeType === "saida") {
      const title = search ? `Gastos de ${search}` : "Gastos";
      return [
        `${title}${period ? ` ${period}` : ""}:`,
        `Registros: ${rows.length}.`,
        `Total gasto: ${money(saidas || total)}.`
      ].join("\n");
    }
    if (financeType === "entrada") {
      const title = search ? `Receitas de ${search}` : "Receitas";
      return [
        `${title}${period ? ` ${period}` : ""}:`,
        `Registros: ${rows.length}.`,
        `Total recebido: ${money(entradas || total)}.`
      ].join("\n");
    }
    const aggregateText = plan.aggregations?.length && total !== entradas + saidas ? `Total filtrado: ${money(total)}.` : "";
    const title = search
      ? `Resumo financeiro de ${search}${period ? ` ${period}` : ""}`
      : period ? `Relatório financeiro ${period}` : "Resumo financeiro";
    return [
      `${title}:`,
      `Registros: ${rows.length}.`,
      `Entradas: ${money(entradas)}.`,
      `Saídas: ${money(saidas)}.`,
      `Saldo: ${money(entradas - saidas)}.`,
      aggregateText
    ].filter(Boolean).join("\n");
  }

  if (domain.domain === "producao_leite") {
    return buildProductionResponse(rows, metrics, plan, relations, pagination);
  }

  if (domain.domain === "animais") {
    const specificAnimal = hasSpecificAnimalRefFilter(plan);
    if (!rows.length) {
      return specificAnimal ? "Não encontrei esse animal no rebanho." : buildAnimalCollectiveResponse(rows, plan);
    }
    if (!specificAnimal || rows.length > 1) {
      return buildAnimalCollectiveResponse(rows, plan, pagination?.offset || 0, pagination?.pageSize || 10);
    }

    const animal = rows[0];
    const selectedLines = animalSelectedFieldLines(animal, plan, relations);
    if (selectedLines.length) return [`Dados de ${animalLabel(animal)}:`, ...selectedLines].join("\n");
    const lot = relations.lotsById?.get(String(animal.lote_id || ""))?.nome;
    return [
      `Ficha de ${animalLabel(animal)}:`,
      `Categoria: ${animal.categoria || "sem categoria"}.`,
      `Sexo: ${animal.sexo || "não informado"}.`,
      `Status: ${animal.status || "ativo"}.`,
      `Fase: ${animal.fase || "sem fase"}.`,
      `Lote: ${lot || "sem lote informado"}.`,
      `Data de nascimento: ${animal.data_nascimento ? shortDate(animal.data_nascimento) : "sem registro"}.`,
      animal.peso ? `Peso: ${numberText(Number(animal.peso))} kg.` : "Peso: sem registro.",
      animal.raca ? `Raça: ${animal.raca}.` : "Raça: sem registro.",
      animal.observacoes ? `Observações: ${animal.observacoes}` : "Observações: sem registros.",
      ...animalHistoryLines(relations)
    ].filter(Boolean).join("\n");
  }

  if (domain.domain === "funcionarios") {
    return buildEmployeeResponse(rows, plan, pagination?.offset || 0, pagination?.pageSize || 10);
  }

  if (domain.domain === "ponto_funcionario") {
    return buildPointResponse(rows, plan, relations, pagination?.offset || 0, pagination?.pageSize || 10);
  }

  if (domain.domain === "genealogia") {
    return buildGenealogyResponse(rows, plan, relations, pagination?.offset || 0, pagination?.pageSize || 10);
  }

  if (domain.domain === "observacoes" || domain.domain === "saude_sanitario") {
    return buildEventListResponse(rows, domain, relations, pagination?.offset || 0, pagination?.pageSize || 12);
  }

  // Ultimo recurso: em vez de anunciar apenas a contagem, lista o que achou.
  // "Registros encontrados: 3" nao responde o que o usuario perguntou.
  if (!rows.length) return `Não encontrei registros de ${domain.label.toLowerCase()} para essa consulta.`;
  const offset = pagination?.offset || 0;
  const pageSize = pagination?.pageSize || 10;
  const pageRows = rows.slice(offset, offset + pageSize);
  const nextOffset = offset + pageRows.length;
  return [
    offset ? `Mais registros de ${domain.label.toLowerCase()}:` : `Consulta de ${domain.label.toLowerCase()} (${rows.length}):`,
    ...pageRows.map((row, index) => {
      const clean = sanitizeRowForUser(row, relations);
      const parts = Object.entries(clean)
        .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "")
        .slice(0, 6)
        .map(([key, value]) => `${key.replace(/_/g, " ")}: ${String(value)}`);
      return `${offset + index + 1}. ${parts.join(", ")}`;
    }),
    nextOffset < rows.length ? `...e mais ${rows.length - nextOffset} registro(s). Responda "mostrar mais" para continuar.` : offset ? "Fim da lista." : ""
  ].filter(Boolean).join("\n");
}

/** Lista de eventos com data, tipo, animal e observacao. */
function buildEventListResponse(
  rows: AnyRecord[],
  domain: DomainManifestEntry,
  relations: AnyRecord,
  offset = 0,
  pageSize = 12
) {
  if (!rows.length) return `Não encontrei eventos registrados para essa consulta.`;
  const pageRows = rows.slice(offset, offset + pageSize);
  if (!pageRows.length) return "Não há mais eventos para mostrar.";
  const nextOffset = offset + pageRows.length;
  return [
    offset ? `Mais ${pageRows.length} evento(s):` : `Eventos encontrados (${rows.length}):`,
    ...pageRows.map((row, index) => {
      const animal = relations.animalsById?.get(String(row.animal_id || ""));
      const detail = [row.descricao, row.medicamento].filter(Boolean).join(" - ");
      const who = animal ? `${animalLabel(animal)} - ` : "";
      return `${offset + index + 1}. ${shortDate(row.data_evento || row.created_at)} - ${who}${eventTypeLabel(row.tipo)}${detail ? ` - ${detail}` : ""}`;
    }),
    nextOffset < rows.length ? `...e mais ${rows.length - nextOffset} evento(s). Responda "mostrar mais" para continuar.` : "Fim da lista."
  ].join("\n");
}

async function loadRelationContext(supabase: ActionPlanSupabaseLike | null | undefined, owner: ActionPlanOwnerContext, plan: QueryActionPlan) {
  const relations: AnyRecord = {};
  if (!supabase || !owner.fazenda_id) return relations;

  if (plan.domain === "animais" || plan.domain === "genealogia" || ["reproducao", "saude_sanitario", "producao_leite"].includes(plan.domain) || plan.filters.some((filter) => filter.field === "animal_ref")) {
    const { data } = await supabase
      .from(TABLES.animais)
      .select("id,brinco,nome,categoria,pai_id,mae_id")
      .eq("fazenda_id", owner.fazenda_id)
      .limit(1000);
    relations.animalsById = new Map(((data || []) as AnyRecord[]).map((animal) => [String(animal.id), animal]));
  }

  if (plan.domain === "animais" || plan.filters.some((filter) => ["lote_id", "lote_ref"].includes(filter.field))) {
    const { data } = await supabase
      .from(TABLES.lotes)
      .select("id,nome")
      .eq("fazenda_id", owner.fazenda_id)
      .limit(1000);
    relations.lotsById = new Map(((data || []) as AnyRecord[]).map((lot) => [String(lot.id), lot]));
  }

  // Ficha de um animal sem historico responde pela metade: o produtor quer
  // saber o que aconteceu com ele, com data e observacao, nao so o cadastro.
  if (plan.domain === "animais" && hasSpecificAnimalRefFilter(plan) && relations.animalsById) {
    const reference = plan.filters.find((filter) => filter.field === "animal_ref")?.value;
    const target = Array.from(relations.animalsById.values() as Iterable<AnyRecord>)
      .find((animal) => referenceMatches([animal.brinco, animal.nome, animal.id], reference));
    if (target) {
      const [events, milkings] = await Promise.all([
        supabase
          .from(TABLES.eventosAnimal)
          .select("id,tipo,data_evento,descricao,medicamento,custo,created_at")
          .eq("fazenda_id", owner.fazenda_id)
          .eq("animal_id", target.id)
          .order("data_evento", { ascending: false })
          .limit(50),
        supabase
          .from(TABLES.ordenhas)
          .select("id,litros,ordenhado_em,turno")
          .eq("fazenda_id", owner.fazenda_id)
          .eq("animal_id", target.id)
          .order("ordenhado_em", { ascending: false })
          .limit(10)
      ]);
      relations.animalHistory = {
        animalId: String(target.id),
        eventos: (events?.data || []) as AnyRecord[],
        ordenhas: (milkings?.data || []) as AnyRecord[]
      };
    }
  }

  if (plan.domain === "funcionarios" || plan.domain === "ponto_funcionario" || plan.filters.some((filter) => filter.field === "funcionario_ref")) {
    const { data } = await supabase
      .from(TABLES.funcionarios)
      .select("id,nome,funcao,ativo")
      .eq("fazenda_id", owner.fazenda_id)
      .limit(1000);
    relations.employeesById = new Map(((data || []) as AnyRecord[]).map((employee) => [String(employee.id), employee]));
  }

  return relations;
}

function queryPaginationPageSize(domain: DomainManifestEntry, plan: QueryActionPlan) {
  if (domain.domain === "animais" && !hasSpecificAnimalRefFilter(plan)) return 10;
  if (wantsDetailedList(plan)) return 10;
  if (domain.domain === "funcionarios" && !plan.filters.some((filter) => filter.field === "funcionario_ref")) return 10;
  if (domain.domain === "genealogia" && !plan.filters.some((filter) => ["animal_ref", "filho_ref"].includes(filter.field))) return 10;
  if (["observacoes", "saude_sanitario", "ponto_funcionario", "agenda_tarefas", "lotes"].includes(domain.domain)) return 10;
  return 0;
}

function paginationTotal(domain: DomainManifestEntry, rows: AnyRecord[]) {
  // Ponto e exibido por funcionario, embora cada linha do banco seja uma
  // marcacao. A pagina precisa avancar pela mesma unidade que a resposta.
  if (domain.domain === "ponto_funcionario") {
    return new Set(rows.map((row) => String(row.funcionario_id || "sem_funcionario"))).size;
  }
  return rows.length;
}

function nextQueryPagination(
  domain: string,
  plan: QueryActionPlan,
  currentDate: string | undefined,
  total: number,
  offset: number,
  pageSize: number
): ActionPlanQueryPagination | undefined {
  const nextOffset = Math.min(total, offset + pageSize);
  if (nextOffset >= total) return undefined;
  return {
    tipo: "action_plan_query",
    domain,
    plan,
    currentDate,
    offset: nextOffset,
    pageSize,
    total
  };
}

export async function executeQueryActionPlan(input: ExecuteQueryActionPlanInput): Promise<ExecuteQueryActionPlanResult> {
  const validation = validateActionPlan(input.plan);

  if (!validation.ok) {
    return {
      ok: false,
      status: validation.status === "blocked" ? "blocked" : "clarify",
      reason: validation.reason,
      message: validation.status === "blocked"
        ? "Nao posso executar esse plano com seguranca."
        : "Preciso revisar essa consulta antes de executar."
    };
  }

  let plan = validation.value as QueryActionPlan;
  if (!canQueryBotDomain(input.owner.papel_bot, plan.domain)) {
    return {
      ok: false,
      status: "blocked",
      reason: "bot_role_query_denied",
      message: botQueryDeniedMessage(plan.domain)
    };
  }
  if (shouldUseGeneralEventReport(plan)) {
    return executeGeneralEventReportQuery(input, plan);
  }
  const domain = getDomainManifest(plan.domain);

  if (domain) {
    const temporalAnchor = await resolveTemporalAnchorPlan(input, plan, domain);
    if (!temporalAnchor.ok) {
      return {
        ok: false,
        status: "clarify",
        reason: temporalAnchor.reason,
        message: temporalAnchor.message
      };
    }
    plan = temporalAnchor.plan;
  }

  if (domain?.domain === "reproducao") {
    return executeReproductionQuery(input, plan, domain);
  }

  if (domain?.domain === "estoque") {
    return executeStockQuery(input, plan, domain);
  }

  const tableName = domain ? queryTable(domain) : null;
  if (!domain || !tableName || tableName.includes("+")) {
    return {
      ok: false,
      status: "clarify",
      reason: "domain_without_safe_table_mapping",
      message: "Ainda não tenho um mapeamento seguro para consultar esse tipo de informação."
    };
  }

  if (!input.owner.fazenda_id) {
    return {
      ok: false,
      status: "blocked",
      reason: "missing_fazenda_scope",
      message: "Nao posso consultar sem escopo do rancho."
    };
  }

  if (!input.supabase) {
    const parsed = finalizeActionPlanParsed(QUERY_INTENT_BY_DOMAIN[domain.domain] || "DESCONHECIDO", {
      consulta: true,
    }, [], plan.confidence, plan, { interpreterFinal: "action_plan_query_planned" });
    return {
      ok: true,
      parsed,
      response: "Consulta preparada, mas sem contexto de dados para executar agora.",
      rows: []
    };
  }

  const detailedList = wantsDetailedList(plan);
  const limit = detailedList ? domain.maxLimit : Math.min(plan.limit || domain.maxLimit, domain.maxLimit);
  // Somente filtros de data viram condicao SQL; o resto e avaliado em memoria
  // depois da consulta. Se o banco ja vier cortado no limite do usuario, uma
  // entidade fora dessa janela desaparece antes de ser comparada e o bot
  // responde "nao encontrei" sobre um registro que existe.
  const filtersEvaluatedInMemory = plan.filters.some((filter) => !domain.dateFields.includes(filter.field));
  const needsFullScan = Boolean(detailedList || plan.groupBy?.length || plan.aggregations?.length || filtersEvaluatedInMemory);
  const sourceLimit = needsFullScan ? domain.maxLimit : limit;
  // Agregacao e agrupamento resumem tudo que passou no filtro; consulta comum
  // devolve no maximo o que o usuario pediu.
  const resultLimit = detailedList || plan.groupBy?.length || plan.aggregations?.length ? domain.maxLimit : limit;
  const fieldDefinitions = Object.values(domain.fields) as DomainFieldDefinition[];
  const selectFields = SAFE_SELECT_FIELDS[domain.domain] || [
    "id",
    ...fieldDefinitions.map((definition) => definition.sourceField).filter(Boolean) as string[]
  ];
  let query = input.supabase
    .from(tableName)
    .select(Array.from(new Set(selectFields)).join(","))
    .eq(domain.domain === "fazenda" ? "id" : "fazenda_id", input.owner.fazenda_id)
    .limit(sourceLimit);

  const dateField = plan.filters.find((filter) => domain.dateFields.includes(filter.field));
  if (dateField && shouldApplyRemoteDateFilter(domain)) {
    const range = dateRangeFor(dateField, currentDate(input.currentDate));
    const source = sourceField(domain, dateField.field);
    if (range) query = query.gte(source, dateOnly(range.start)).lt(source, dateOnly(range.end));
  }

  const orderBy = plan.orderBy ? sourceField(domain, plan.orderBy.field) : domain.dateFields[0] ? sourceField(domain, domain.dateFields[0]) : "created_at";
  query = query.order(orderBy, { ascending: plan.orderBy?.direction === "asc" });

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const relationContext = await loadRelationContext(input.supabase, input.owner, plan);
  const baseDate = currentDate(input.currentDate);
  const rows = ((data || []) as AnyRecord[])
    .filter((row) => plan.filters.every((filter) => filterMatches(row, domain, filter, relationContext, baseDate)))
    .slice(0, resultLimit);
  const metrics = buildAggregations(rows, plan, domain, relationContext);
  const pageSize = Math.max(1, input.pagination?.pageSize || queryPaginationPageSize(domain, plan) || 10);
  const offset = Math.max(0, input.pagination?.offset || 0);
  const response = buildResponse(domain, rows, metrics, plan, relationContext, { offset, pageSize });
  const displayTotal = paginationTotal(domain, rows);
  const nextOffset = Math.min(displayTotal, offset + pageSize);
  const financeSummaryCanOpenDetails = domain.domain === "financeiro" && !wantsDetailedList(plan) && rows.length > 0;
  const pagination: ActionPlanQueryPagination | undefined = financeSummaryCanOpenDetails
    ? {
        tipo: "action_plan_query",
        domain: domain.domain,
        plan: financeDetailPlan(plan),
        currentDate: input.currentDate,
        offset: 0,
        pageSize,
        total: displayTotal
      }
    : queryPaginationPageSize(domain, plan) && nextOffset < displayTotal
      ? {
          tipo: "action_plan_query",
          domain: domain.domain,
          plan,
          currentDate: input.currentDate,
          offset: nextOffset,
          pageSize,
          total: displayTotal
        }
      : undefined;
  const parsed = finalizeActionPlanParsed(QUERY_INTENT_BY_DOMAIN[domain.domain] || "DESCONHECIDO", {
    consulta: true,
    action_plan_response: response,
    action_plan_pagination: pagination,
    resultado: {
      registros: rows.length,
      metrics,
      filters: plan.filters,
      // Quando o usuario pede campos especificos, a resposta nao pode devolver
      // a ficha inteira. Vai como instrucao para quem redige, o que vale para
      // qualquer dominio sem mexer em cada montador de texto.
      campos_pedidos: plan.select?.length ? plan.select : undefined,
      amostra: querySample(domain, rows, relationContext),
      // Linhas exatamente da pagina respondida. Diferente de amostra, que
      // sempre parte da primeira linha e corrompe paginas seguintes.
      linhas_pagina: querySample(domain, rows.slice(offset, offset + pageSize), relationContext),
      pagina: { offset, pageSize, total: displayTotal }
    }
  }, [], plan.confidence, plan, { interpreterFinal: "action_plan_query" });

  return { ok: true, parsed, response, rows };
}
