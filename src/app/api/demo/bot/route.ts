import { NextRequest, NextResponse } from "next/server";
import { interpretWithGemini } from "@/lib/whatsapp/gemini/interpreter";
import type { ActionPlan } from "@/lib/whatsapp/gemini/action-plan-types";
import type { ParsedRanchoMessage } from "@/lib/whatsapp/nlp";
import { composeBotResponseWithAI } from "@/services/whatsapp/ai-response-composer";
import type { BotSession } from "@/services/whatsapp/session-service";
import {
  cloneDemoStore,
  type DemoAnimal,
  type DemoProduction,
  type DemoStore,
  type DemoStock,
  type DemoTransaction
} from "@/lib/marketing/demo-store";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const MAX_MESSAGE_LENGTH = 500;
const MAX_ROWS_PER_COLLECTION = 120;
const DEMO_TIMEZONE = "America/Fortaleza";

type DemoPendingAction = {
  plan: ActionPlan;
  summary: string;
};

type DemoExecution = {
  response: string;
  parsed: ParsedRanchoMessage;
};

type DemoQueryResult = DemoExecution & {
  result: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function numberFrom(...values: unknown[]) {
  for (const value of values) {
    const number = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function textFrom(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function planData(plan: ActionPlan) {
  return "data" in plan && isRecord(plan.data) ? plan.data : {};
}

function planSemantic(plan: ActionPlan) {
  return "semantic" in plan && isRecord(plan.semantic) ? plan.semantic : {};
}

function planEntities(plan: ActionPlan) {
  const semantic = planSemantic(plan);
  return isRecord(semantic.entities) ? semantic.entities : {};
}

function getPlanField(plan: ActionPlan, keys: string[]) {
  const data = planData(plan) as Record<string, unknown>;
  const entities = planEntities(plan);
  const semantic = planSemantic(plan) as Record<string, unknown>;
  for (const key of keys) {
    const value = data[key] ?? entities[key] ?? semantic[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function normalizeStore(value: unknown): DemoStore {
  const base = cloneDemoStore();
  if (!isRecord(value)) return base;
  const cap = (key: keyof DemoStore) => {
    const candidate = value[key];
    return Array.isArray(candidate) ? candidate.slice(0, MAX_ROWS_PER_COLLECTION) : base[key];
  };
  return {
    animals: cap("animals") as DemoAnimal[],
    transactions: cap("transactions") as DemoTransaction[],
    stock: cap("stock") as DemoStock[],
    production: cap("production") as DemoProduction[]
  };
}

function normalizeName(value: string) {
  return value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function findAnimal(store: DemoStore, reference: string) {
  const target = normalizeName(reference);
  return store.animals.find((animal) => normalizeName(animal.code) === target || normalizeName(animal.name) === target)
    || store.animals.find((animal) => normalizeName(`${animal.category} ${animal.code}`) === target);
}

function currency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function actionLabel(plan: ActionPlan) {
  if (plan.action === "import_table") return "importação da tabela";
  if (plan.action === "query") return "consulta";
  if (plan.action === "create") return "cadastro";
  if (plan.action === "update") return "atualização";
  if (plan.action === "execute") return "operação";
  return "ação";
}

function demoIntentForPlan(plan: ActionPlan) {
  if (plan.action === "query") {
    const domain = "domain" in plan ? plan.domain : "";
    if (domain === "animais") return "CONSULTA_REBANHO";
    if (domain === "financeiro") return "CONSULTA_FINANCEIRO";
    if (domain === "estoque") return "CONSULTA_ESTOQUE";
    if (domain === "producao_leite") return "CONSULTA_PRODUCAO";
    return "CONSULTA_RANCHO";
  }
  if (plan.action === "import_table") return "IMPORTACAO_TABELA_DOMINIO";
  if (plan.action === "create") {
    const domain = "domain" in plan ? plan.domain : "";
    if (domain === "animais") return "CADASTRO_ANIMAL";
    if (domain === "financeiro") return "RECEITA_VENDA";
    if (domain === "estoque") return "ESTOQUE_ENTRADA";
    if (domain === "producao_leite") return "PRODUCAO_LEITE";
  }
  if (plan.action === "update") return "ATUALIZACAO_ANIMAL";
  if (plan.action === "execute") return "EXECUCAO_ACTION_PLAN";
  return "DESCONHECIDO";
}

function demoParsedFromPlan(plan: ActionPlan, dados: Record<string, unknown> = {}) {
  return {
    tipo: demoIntentForPlan(plan),
    confianca: "confidence" in plan ? plan.confidence : 0.9,
    perguntas_faltantes: "missingFields" in plan && Array.isArray(plan.missingFields) ? plan.missingFields : [],
    campos_faltantes: "missingFields" in plan && Array.isArray(plan.missingFields) ? plan.missingFields : [],
    dados: {
      ...("data" in plan && isRecord(plan.data) ? plan.data : {}),
      ...dados,
      consulta: plan.action === "query",
      action_plan: plan,
      origem_parser: "gemini_action_plan"
    }
  } as unknown as ParsedRanchoMessage;
}

function demoSession(etapa: BotSession["etapa"], dados: Record<string, unknown> = {}): BotSession {
  return { etapa, dados };
}

async function composeDemoResponse(input: {
  response: string;
  plan: ActionPlan;
  previousSession: BotSession;
  nextSession: BotSession;
  eventConfirmed?: boolean;
  dados?: Record<string, unknown>;
  userMessage: string;
}) {
  const parsed = demoParsedFromPlan(input.plan, input.dados);
  const composed = await composeBotResponseWithAI({
    response: input.response,
    userMessage: input.userMessage,
    parsed,
    previousSession: input.previousSession,
    nextSession: input.nextSession,
    eventConfirmed: input.eventConfirmed,
    modoTeste: false
  });
  return { response: composed.response, parsed, usedAI: composed.usedAI };
}

function mutationSummary(plan: ActionPlan) {
  const domain = "domain" in plan ? plan.domain : "";
  const data = planData(plan);
  if (domain === "animais") {
    const name = textFrom(getPlanField(plan, ["nome", "name"]), getPlanField(plan, ["animal_ref"]));
    const category = textFrom(getPlanField(plan, ["categoria", "category"]), "animal");
    const code = textFrom(getPlanField(plan, ["brinco", "codigo", "code"]));
    return `Vou cadastrar ${category}${name ? ` ${name}` : ""}${code ? ` (${code})` : ""} no rebanho.`;
  }
  if (domain === "financeiro") {
    const value = numberFrom(getPlanField(plan, ["valor", "value"]));
    const type = textFrom(getPlanField(plan, ["tipo", "type"]), "movimentação financeira");
    return `Vou registrar ${type}${value === null ? "" : ` de ${currency(value)}`}.`;
  }
  if (domain === "estoque") {
    const item = textFrom(getPlanField(plan, ["item_ref", "item", "nome", "produto"]), "item de estoque");
    const quantity = numberFrom(getPlanField(plan, ["quantidade", "quantidade_inicial", "quantity"]));
    const unit = textFrom(getPlanField(plan, ["unidade", "unit"]));
    return `Vou cadastrar ou movimentar ${item}${quantity === null ? "" : ` (${quantity}${unit ? ` ${unit}` : ""})`}.`;
  }
  if (domain === "producao_leite") {
    const liters = numberFrom(getPlanField(plan, ["litros", "quantidade", "value"]));
    const animal = textFrom(getPlanField(plan, ["animal_ref", "animal"]), "o animal informado");
    return `Vou registrar ${liters ?? "a"} litros de leite para ${animal}.`;
  }
  return `Vou concluir esta ${actionLabel(plan)} na demonstração.`;
}

function createAnimal(plan: ActionPlan, store: DemoStore) {
  const name = textFrom(getPlanField(plan, ["nome", "name"]), getPlanField(plan, ["animal_ref"]));
  const code = textFrom(getPlanField(plan, ["brinco", "codigo", "code"]));
  if (!name || !code) return "Para cadastrar o animal na demonstração, preciso do nome e do código/brinco.";
  const animal: DemoAnimal = {
    name,
    code,
    category: textFrom(getPlanField(plan, ["categoria", "category"]), "Vaca"),
    phase: textFrom(getPlanField(plan, ["fase", "fase_produtiva", "phase"]), "Crescimento")
  };
  store.animals = [animal, ...store.animals.filter((item) => item.code !== code)];
  return `Cadastro concluído: ${animal.name} (${animal.code}) entrou no rebanho demonstrativo.`;
}

function createFinance(plan: ActionPlan, store: DemoStore) {
  const value = numberFrom(getPlanField(plan, ["valor", "value"]));
  if (value === null || value <= 0) return "Para registrar a movimentação, preciso informar o valor.";
  const rawType = normalizeName(textFrom(getPlanField(plan, ["tipo", "type"]), "saida"));
  const positive = rawType.includes("entrada") || rawType.includes("receita") || rawType.includes("venda");
  const label = textFrom(getPlanField(plan, ["descricao", "description", "categoria", "category"]), "Movimentação pelo bot");
  const transaction: DemoTransaction = { id: Date.now(), label, date: "Agora", value, positive };
  store.transactions = [transaction, ...store.transactions];
  return `Movimentação registrada na demonstração: ${positive ? "entrada" : "saída"} de ${currency(value)} (${label}).`;
}

function createStock(plan: ActionPlan, store: DemoStore) {
  const name = textFrom(getPlanField(plan, ["item_ref", "item", "nome", "produto"]));
  const quantity = numberFrom(getPlanField(plan, ["quantidade", "quantidade_inicial", "quantity"]));
  if (!name || quantity === null || quantity <= 0) return "Para registrar o estoque, preciso do item e de uma quantidade positiva.";
  const unit = textFrom(getPlanField(plan, ["unidade", "unit"]), "unidade");
  const movement = normalizeName(textFrom(getPlanField(plan, ["tipo_movimento", "movimento", "tipo"]), "entrada"));
  const existing = store.stock.find((item) => normalizeName(item.name) === normalizeName(name));
  const signedQuantity = movement.includes("saida") || movement.includes("despesa") ? -quantity : quantity;
  if (existing) existing.qty = Math.max(0, existing.qty + signedQuantity);
  else store.stock = [{ name, qty: Math.max(0, signedQuantity), unit, min: Math.max(1, Math.floor(quantity * 0.2)) }, ...store.stock];
  return `Estoque atualizado na demonstração: ${name} agora tem ${existing ? existing.qty : Math.max(0, signedQuantity)} ${unit}.`;
}

function applyImportTable(plan: ActionPlan, store: DemoStore) {
  const domain = "domain" in plan ? plan.domain : "";
  const rows = plan.action === "import_table" && Array.isArray(plan.data?.rows) ? plan.data.rows : [];
  if (!rows.length) return "A tabela foi reconhecida, mas não trouxe linhas utilizáveis para a demonstração.";
  const responses: string[] = [];
  for (const row of rows.slice(0, MAX_ROWS_PER_COLLECTION)) {
    const rowPlan = { ...plan, action: "create", data: row } as unknown as ActionPlan;
    if (domain === "animais") responses.push(createAnimal(rowPlan, store));
    else if (domain === "financeiro") responses.push(createFinance(rowPlan, store));
    else if (domain === "estoque") responses.push(createStock(rowPlan, store));
    else if (domain === "producao_leite") responses.push(createProduction(rowPlan, store));
  }
  return `${rows.length} linha(s) importada(s) na base demonstrativa.\n${responses.slice(0, 3).join("\n")}${responses.length > 3 ? "\nAs demais linhas também foram aplicadas." : ""}`;
}

function createProduction(plan: ActionPlan, store: DemoStore) {
  const liters = numberFrom(getPlanField(plan, ["litros", "quantidade", "value"]));
  const animalRef = textFrom(getPlanField(plan, ["animal_ref", "animal"]));
  if (liters === null || liters <= 0 || !animalRef) return "Para registrar a produção, preciso do animal e da quantidade de litros.";
  const animal = findAnimal(store, animalRef);
  const label = animal ? `${animal.name} (${animal.code})` : animalRef;
  store.production = [{ id: Date.now(), animal: label, liters, date: "Agora" }, ...store.production];
  return `Produção registrada na demonstração: ${liters} litros de ${label}.`;
}

function applyMutation(plan: ActionPlan, store: DemoStore) {
  const domain = "domain" in plan ? plan.domain : "";
  if (plan.action === "import_table") return applyImportTable(plan, store);
  if (domain === "animais") return createAnimal(plan, store);
  if (domain === "financeiro") return createFinance(plan, store);
  if (domain === "estoque") {
    const stockResponse = createStock(plan, store);
    const value = numberFrom(getPlanField(plan, ["valor", "value"]));
    if (value !== null && value > 0) {
      const financeResponse = createFinance(plan, store);
      return `${stockResponse}\n${financeResponse}`;
    }
    return stockResponse;
  }
  if (domain === "producao_leite") return createProduction(plan, store);
  if (plan.action === "execute") {
    const capability = plan.capability.toLowerCase();
    if (capability.includes("animal")) return createAnimal(plan, store);
    if (capability.includes("estoque") || capability.includes("item")) return createStock(plan, store);
    if (capability.includes("produc") || capability.includes("leite")) return createProduction(plan, store);
    if (capability.includes("finance") || capability.includes("receita") || capability.includes("despesa")) return createFinance(plan, store);
  }
  return `A demonstração reconheceu a ${actionLabel(plan)}, mas esse tipo de cadastro ainda não está disponível neste exemplo.`;
}

function queryFilters(plan: ActionPlan) {
  return "filters" in plan && Array.isArray(plan.filters) ? plan.filters : [];
}

function queryFilterValue(plan: ActionPlan, fields: string[]) {
  const accepted = new Set(fields.map(normalizeName));
  return queryFilters(plan).find((filter) => accepted.has(normalizeName(filter.field)))?.value;
}

function queryIsDetailed(plan: ActionPlan) {
  const semantic = planSemantic(plan);
  const report = isRecord(semantic.report) ? semantic.report : {};
  return normalizeName(String(report.detailLevel || plan.operation || "")).includes("detalh")
    || normalizeName(String(plan.operation || "")).includes("listar")
    || normalizeName(String(plan.operation || "")).includes("continuar");
}

function queryResult(plan: ActionPlan, response: string, linhas: unknown[], extra: Record<string, unknown> = {}): DemoQueryResult {
  const result = {
    registros: linhas.length,
    filters: queryFilters(plan),
    linhas_pagina: linhas,
    ...extra
  };
  return {
    response,
    result,
    parsed: demoParsedFromPlan(plan, { resultado: result })
  };
}

function queryDemo(plan: ActionPlan, store: DemoStore): DemoQueryResult {
  const domain = "domain" in plan ? plan.domain : "";
  const targetAnimal = queryFilterValue(plan, ["animal_ref", "animal_codigo", "brinco", "nome"]);
  const targetCategory = queryFilterValue(plan, ["categoria", "animal_categoria"]);
  const targetItem = queryFilterValue(plan, ["item", "item_ref", "produto", "descricao"]);
  const detailed = queryIsDetailed(plan);

  if (domain === "animais") {
    const animals = store.animals.filter((animal) => {
      const matchesAnimal = targetAnimal === undefined
        || normalizeName(`${animal.name} ${animal.code}`).includes(normalizeName(String(targetAnimal)));
      const matchesCategory = targetCategory === undefined
        || normalizeName(animal.category) === normalizeName(String(targetCategory));
      return matchesAnimal && matchesCategory;
    });
    const count = "aggregations" in plan && plan.aggregations?.some((item) => item.op === "count");
    const lines = animals.map((animal) => `${animal.name} (${animal.code}) - ${animal.category} - ${animal.phase}`);
    const visibleLines = detailed || count ? lines : lines.slice(0, 8);
    const response = `${count ? `Total: ${animals.length} animais.` : `Encontrei ${animals.length} animais na demonstração.`}${visibleLines.length ? `\n\n${visibleLines.map((line) => `• ${line}`).join("\n")}` : ""}`;
    return queryResult(plan, response, visibleLines, { total: animals.length });
  }

  if (domain === "financeiro") {
    const transactions = targetItem === undefined
      ? store.transactions
      : store.transactions.filter((item) => normalizeName(`${item.label} ${item.positive ? "entrada" : "saida"}`).includes(normalizeName(String(targetItem))));
    const income = transactions.filter((item) => item.positive).reduce((sum, item) => sum + item.value, 0);
    const expense = transactions.filter((item) => !item.positive).reduce((sum, item) => sum + item.value, 0);
    const lines = transactions.map((item) => `${item.date} - ${item.positive ? "Entrada" : "Saída"} - ${item.label}: ${currency(item.value)}`);
    const response = detailed
      ? `Transações financeiras da demonstração (${transactions.length}):\n${lines.map((line) => `• ${line}`).join("\n")}`
      : `Resumo financeiro da demonstração:\n• Entradas: ${currency(income)}\n• Saídas: ${currency(expense)}\n• Saldo: ${currency(income - expense)}`;
    return queryResult(plan, response, detailed ? lines : [], { total_entradas: income, total_saidas: expense, saldo: income - expense });
  }

  if (domain === "estoque") {
    const items = targetItem === undefined
      ? store.stock
      : store.stock.filter((item) => normalizeName(item.name).includes(normalizeName(String(targetItem))));
    const lines = items.map((item) => `${item.name}: ${item.qty} ${item.unit} (mínimo ${item.min})`);
    const response = `Estoque demonstrativo (${items.length} item(ns)):\n${lines.map((line) => `• ${line}`).join("\n")}`;
    return queryResult(plan, response, lines, { total: items.length });
  }

  if (domain === "producao_leite") {
    const production = targetAnimal === undefined
      ? store.production
      : store.production.filter((item) => normalizeName(item.animal).includes(normalizeName(String(targetAnimal))));
    const total = production.reduce((sum, item) => sum + item.liters, 0);
    const average = total / Math.max(production.length, 1);
    const lines = production.map((item) => `${item.date} - ${item.animal}: ${item.liters.toLocaleString("pt-BR")} litros`);
    const response = detailed
      ? `Produção de leite na demonstração (${production.length} registro(s)):\n${lines.map((line) => `• ${line}`).join("\n")}\n\nTotal: ${total.toLocaleString("pt-BR")} litros. Média: ${average.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} litros por registro.`
      : `Produção de leite na demonstração:\n• Registros: ${production.length}\n• Total: ${total.toLocaleString("pt-BR")} litros\n• Média: ${average.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} litros por registro`;
    return queryResult(plan, response, detailed ? lines : [], { total_litros: total, media_litros: average });
  }

  return queryResult(plan, "A demonstração reconheceu a consulta, mas ainda não há dados de exemplo para essa área.", []);
}

function isConfirmation(message: string) {
  return /^(1|sim|s|confirmar|confirma|pode|ok|okay)$/i.test(message.trim());
}

function isCancellation(message: string) {
  return /^(2|nao|não|n|cancelar|cancela|desistir)$/i.test(message.trim());
}

function fallbackResponse() {
  return "Não consegui interpretar a demonstração agora. Tente uma das mensagens sugeridas ou descreva um cadastro, uma movimentação ou uma consulta do Rancho.";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    if (!message || message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ ok: false, response: "Mensagem inválida." }, { status: 400 });
    }

    const store = normalizeStore(body?.store);
    const pending = isRecord(body?.pendingAction) && isRecord(body.pendingAction.plan)
      ? body.pendingAction as DemoPendingAction
      : null;
    const previousSession = demoSession(
      pending ? "aguardando_confirmacao" : "livre",
      {
        demo_database: store,
        pending_action: pending?.plan || null
      }
    );

    if (pending && isCancellation(message)) {
      return NextResponse.json({ ok: true, response: "Tudo bem. Não alterei a base de demonstração.", store, pendingAction: null, source: "action_plan" });
    }
    if (pending && isConfirmation(message)) {
      const response = applyMutation(pending.plan, store);
      const composed = await composeDemoResponse({
        response,
        plan: pending.plan,
        previousSession,
        nextSession: demoSession("livre", { demo_database: store }),
        eventConfirmed: true,
        userMessage: message
      });
      return NextResponse.json({
        ok: true,
        response: composed.response,
        store,
        pendingAction: null,
        source: "action_plan",
        response_composer_used: composed.usedAI
      });
    }

    const interpretation = await interpretWithGemini({
      text: message,
      session: {
        etapa: pending ? "aguardando_confirmacao" : "livre",
        dados: {
          demo_database: store,
          pending_action: pending?.plan || null
        }
      },
      user: { papel_bot: "admin", nome: "Demonstração Rancho" },
      rancho: { fazenda_id: "demo" },
      currentDate: new Date().toISOString().slice(0, 10),
      timezone: DEMO_TIMEZONE
    });

    if (!interpretation.ok) {
      return NextResponse.json({ ok: true, response: fallbackResponse(), store, pendingAction: null, source: "fallback" });
    }

    const plan = interpretation.interpretation.action_plan;
    if (!plan) {
      return NextResponse.json({ ok: true, response: interpretation.interpretation.response_hint || fallbackResponse(), store, pendingAction: null, source: "action_plan" });
    }
    if (plan.action === "clarify" || plan.action === "block") {
      const planRecord = plan as unknown as Record<string, unknown>;
      const response = (typeof planRecord.userQuestion === "string" && planRecord.userQuestion)
        || (typeof planRecord.question === "string" && planRecord.question)
        || "Pode me explicar um pouco melhor o que você deseja fazer na demonstração?";
      return NextResponse.json({ ok: true, response, store, pendingAction: null, source: "action_plan" });
    }
    if (plan.action === "query") {
      const executed = queryDemo(plan, store);
      const composed = await composeDemoResponse({
        response: executed.response,
        plan,
        previousSession: demoSession("livre", { demo_database: store }),
        nextSession: demoSession("livre", { demo_database: store }),
        dados: executed.result,
        userMessage: message
      });
      return NextResponse.json({
        ok: true,
        response: composed.response,
        store,
        pendingAction: null,
        source: "action_plan",
        response_composer_used: composed.usedAI,
        result: executed.result
      });
    }

    const summary = mutationSummary(plan);
    const response = `${summary}\n\nEstá correto?\n1 - Confirmar\n2 - Cancelar`;
    const composed = await composeDemoResponse({
      response,
      plan,
      previousSession: demoSession("livre", { demo_database: store }),
      nextSession: demoSession("aguardando_confirmacao", {
        demo_database: store,
        pending_action: plan
      }),
      userMessage: message
    });
    return NextResponse.json({
      ok: true,
      response: composed.response,
      store,
      pendingAction: { plan, summary },
      source: "action_plan",
      response_composer_used: composed.usedAI
    });
  } catch {
    return NextResponse.json({ ok: true, response: fallbackResponse(), source: "fallback" });
  }
}
