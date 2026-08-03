import { NextRequest, NextResponse } from "next/server";
import { interpretWithGemini } from "@/lib/whatsapp/gemini/interpreter";
import type { ActionPlan } from "@/lib/whatsapp/gemini/action-plan-types";
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

function queryDemo(plan: ActionPlan, store: DemoStore) {
  const domain = "domain" in plan ? plan.domain : "";
  const filters = "filters" in plan && Array.isArray(plan.filters) ? plan.filters : [];
  if (domain === "animais") {
    const category = filters.find((filter) => filter.field === "categoria")?.value;
    const animals = typeof category === "string" ? store.animals.filter((animal) => normalizeName(animal.category) === normalizeName(category)) : store.animals;
    const count = "aggregations" in plan && plan.aggregations?.some((item) => item.op === "count") ? `Total: ${animals.length} animais.` : "";
    const sample = animals.slice(0, 8).map((animal) => `• ${animal.name} (${animal.code}) — ${animal.category}`).join("\n");
    return `${count || `Encontrei ${animals.length} animais na demonstração.`}${sample ? `\n\n${sample}` : ""}`;
  }
  if (domain === "financeiro") {
    const income = store.transactions.filter((item) => item.positive).reduce((sum, item) => sum + item.value, 0);
    const expense = store.transactions.filter((item) => !item.positive).reduce((sum, item) => sum + item.value, 0);
    return `Resumo financeiro da demonstração:\n• Entradas: ${currency(income)}\n• Saídas: ${currency(expense)}\n• Saldo: ${currency(income - expense)}`;
  }
  if (domain === "estoque") {
    return `Estoque demonstrativo (${store.stock.length} itens):\n${store.stock.map((item) => `• ${item.name}: ${item.qty} ${item.unit}`).join("\n")}`;
  }
  if (domain === "producao_leite") {
    const total = store.production.reduce((sum, item) => sum + item.liters, 0);
    return `Produção de leite na demonstração:\n• Registros: ${store.production.length}\n• Total: ${total.toLocaleString("pt-BR")} litros\n• Média: ${(total / Math.max(store.production.length, 1)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} litros por registro`;
  }
  return "A demonstração reconheceu a consulta. Explore os módulos ao lado para visualizar os dados disponíveis.";
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

    if (pending && isCancellation(message)) {
      return NextResponse.json({ ok: true, response: "Tudo bem. Não alterei a base de demonstração.", store, pendingAction: null, source: "action_plan" });
    }
    if (pending && isConfirmation(message)) {
      const response = applyMutation(pending.plan, store);
      return NextResponse.json({ ok: true, response, store, pendingAction: null, source: "action_plan" });
    }

    const interpretation = await interpretWithGemini({
      text: message,
      session: { demo_database: store },
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
      return NextResponse.json({ ok: true, response: queryDemo(plan, store), store, pendingAction: null, source: "action_plan" });
    }

    const summary = mutationSummary(plan);
    return NextResponse.json({
      ok: true,
      response: `${summary}\n\nEstá correto?\n1 - Confirmar\n2 - Cancelar`,
      store,
      pendingAction: { plan, summary },
      source: "action_plan"
    });
  } catch {
    return NextResponse.json({ ok: true, response: fallbackResponse(), source: "fallback" });
  }
}
