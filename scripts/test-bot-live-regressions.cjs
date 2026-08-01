/**
 * Regressões reais de consulta. Usa o mesmo prompt e validador do bot, mas
 * curl com timeout explícito para evitar sockets persistentes do terminal.
 * Não executa planos nem grava dados no Supabase.
 */
const childProcess = require("child_process");
const fs = require("fs");
const Module = require("module");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");

function loadDotEnvLocal() {
  const file = path.join(root, ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

loadDotEnvLocal();

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveAlias(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    const base = path.join(root, "src", request.slice(2));
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) {
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions[".ts"] = function loadTs(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: filename
  });
  module._compile(output.outputText, filename);
};

const { buildGeminiSystemPrompt } = require("../src/lib/whatsapp/gemini/system-prompt.ts");
const { parseJsonObjectText } = require("../src/lib/whatsapp/ai-provider-types.ts");
const { validateInterpretedAction } = require("../src/lib/whatsapp/gemini/validator.ts");

const CASES = [
  { id: "inseminacoes_historico", text: "Me mostra todas as inseminações da 396.", domain: "reproducao", animal: "396", event: "inseminacao", detailed: true },
  { id: "producao_apos_parto", text: "quanto a 090 produziu depois do parto?", domain: "producao_leite", animal: "090", anchor: { sourceDomain: "reproducao", event: "parto", occurrence: "latest", direction: "after" }, detailed: true },
  { id: "historico_antes_venda", text: "vou vender a vaca 080 amanhã. Me dá todo o histórico dela pra eu passar pro comprador", sequenceFirstQuery: true },
  { id: "lote_animal", text: "qual o lote da vaca 396", domain: "animais", animal: "396", select: "lote_ref" },
  { id: "nascimento_animal", text: "qual é a data de nascimento da 396", domain: "animais", animal: "396", select: "data_nascimento" },
  { id: "contagem_touros", text: "quantos touros ativos eu tenho", domain: "animais", category: "touro", aggregation: { field: "id", op: "count" } },
  { id: "partos_ano", text: "quais vacas pariram esse ano", domain: "reproducao", event: "parto", period: "current_year", detailed: true }
];

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function matchesFilter(plan, field, value) {
  return (plan.filters || []).some((filter) => filter?.field === field && normalize(filter.value) === normalize(value));
}

function evaluate(test, plan) {
  if (!plan) return "sem ActionPlan";
  if (test.sequenceFirstQuery) {
    return plan.action === "sequence" && plan.steps?.[0]?.action === "query"
      ? null
      : "a consulta precisa ser o primeiro passo da sequencia";
  }
  if (plan.action !== "query") return `acao ${plan.action}, esperava query`;
  if (plan.domain !== test.domain) return `dominio ${plan.domain}, esperava ${test.domain}`;
  if (test.animal && !matchesFilter(plan, "animal_ref", test.animal)) return `animal_ref=${test.animal} ausente`;
  if (test.event && !matchesFilter(plan, "evento", test.event)) return `evento=${test.event} ausente`;
  if (test.category && !matchesFilter(plan, "categoria", test.category)) return `categoria=${test.category} ausente`;
  if (test.select && !(plan.select || []).includes(test.select)) return `select ${test.select} ausente`;
  if (test.period && !(plan.filters || []).some((filter) => filter?.field === "data" && filter?.op === test.period)) return `periodo ${test.period} ausente`;
  if (test.detailed && plan.semantic?.report?.detailLevel !== "detalhado") return "detailLevel=detalhado ausente";
  if (test.aggregation && !(plan.aggregations || []).some((item) => item?.field === test.aggregation.field && item?.op === test.aggregation.op)) return "agregacao esperada ausente";
  if (test.anchor) {
    for (const [field, value] of Object.entries(test.anchor)) {
      if (normalize(plan.semantic?.temporalAnchor?.[field]) !== normalize(value)) return `temporalAnchor.${field} incorreto`;
    }
  }
  return null;
}

function callOpenRouter(prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const model = process.env.BOT_AI_MODEL || process.env.OPENROUTER_MODEL;
  if (!apiKey || !model) throw new Error("OPENROUTER_API_KEY ou BOT_AI_MODEL ausente");
  const baseUrl = String(process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/+$/, "");
  const payload = JSON.stringify({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
    max_tokens: 1200,
    response_format: { type: "json_object" }
  });
  const temporaryRequest = path.join(process.env.TEMP || process.env.TMP || root, `rancho-action-plan-${process.pid}-${Date.now()}.json`);
  fs.writeFileSync(temporaryRequest, payload, "utf8");
  try {
    const response = childProcess.execFileSync("curl.exe", [
      "--silent", "--show-error", "--max-time", "35", "--connect-timeout", "8",
      "--request", "POST", `${baseUrl}/chat/completions`,
      "--header", `Authorization: Bearer ${apiKey}`,
      "--header", "Content-Type: application/json",
      "--data-binary", `@${temporaryRequest}`
    ], { encoding: "utf8" });
    const body = JSON.parse(response);
    const content = body?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) throw new Error(body?.error?.message || "OpenRouter nao retornou conteudo");
    return content;
  } finally {
    fs.rmSync(temporaryRequest, { force: true });
  }
}

const requestedCases = process.argv.slice(2).map(normalize).filter(Boolean);
const environmentFilter = normalize(process.env.BOT_LIVE_CASE_FILTER);
const filters = requestedCases.length ? requestedCases : environmentFilter ? [environmentFilter] : [];
const active = filters.length
  ? CASES.filter((test) => filters.some((filter) => test.id.includes(filter)))
  : CASES;

if (!active.length) {
  console.error("Nenhum caso live selecionado.");
  process.exit(1);
}

console.log(`Teste real de regressões ActionPlan: ${active.length} caso(s), sem gravar dados.`);
let failures = 0;
for (const test of active) {
  try {
    const raw = callOpenRouter(buildGeminiSystemPrompt({
      text: test.text,
      currentDate: "2026-08-01",
      timezone: "America/Fortaleza"
    }));
    const validated = validateInterpretedAction(parseJsonObjectText(raw), {
      originalText: test.text,
      currentDate: "2026-08-01",
      timezone: "America/Fortaleza"
    });
    const plan = validated.ok ? validated.value.action_plan : null;
    const failure = validated.ok ? evaluate(test, plan) : validated.reason;
    if (failure) {
      failures += 1;
      console.log(`FALHA [${test.id}] ${failure}`);
      if (plan) {
        console.log(`  plano: ${JSON.stringify({ action: plan.action, domain: plan.domain, operation: plan.operation, steps: plan.steps?.map((step) => ({ action: step.action, domain: step.domain, capability: step.capability })) })}`);
      }
    } else {
      console.log(`OK [${test.id}] ${plan.action}/${plan.domain || "sem-dominio"}`);
    }
  } catch (error) {
    failures += 1;
    console.log(`FALHA [${test.id}] ${error instanceof Error ? error.message : "erro desconhecido"}`);
  }
}

console.log(`Resultado: ${active.length - failures}/${active.length}`);
process.exitCode = failures ? 1 : 0;
