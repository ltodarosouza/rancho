/**
 * Teste de interpretacao com IA real, cobrindo todas as areas do rancho.
 *
 * So interpreta: nunca executa o plano, entao nada e gravado no Supabase.
 * O objetivo nao e acertar frase por frase, e sim revelar PADROES de falha.
 * Por isso cada caso aceita um conjunto de dominios/acoes plausiveis, em vez
 * de uma unica resposta correta.
 *
 * Uso: node scripts/test-bot-live-areas.cjs
 */
const fs = require("fs");
const path = require("path");
const Module = require("module");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");

function loadDotEnvLocal() {
  const file = path.join(root, ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[match[1]] === undefined) process.env[match[1]] = value;
  }
}

loadDotEnvLocal();
process.env.BOT_INTERPRETER = "gemini";
process.env.GEMINI_MODE = "live";
process.env.GEMINI_ACTION_PLAN_ENABLED = "true";
process.env.ALLOW_LIVE_GEMINI_TESTS = "true";

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

const { interpretWithGemini } = require("../src/lib/whatsapp/gemini/interpreter.ts");

// area: para agrupar padroes. estilo: como o usuario escreveu.
// aceita: dominios plausiveis. acoes: acoes plausiveis.
const CASOS = [
  // --- Consulta de rebanho ---
  { area: "Rebanho", estilo: "direto", texto: "quais sao minhas vacas", aceita: ["animais"], acoes: ["query"] },
  { area: "Rebanho", estilo: "giria", texto: "me mostra o gadinho ai", aceita: ["animais"], acoes: ["query"] },
  { area: "Rebanho", estilo: "typo", texto: "quantos animas eu tenh", aceita: ["animais"], acoes: ["query"] },
  { area: "Rebanho", estilo: "especifico", texto: "dados da vaca 5202", aceita: ["animais"], acoes: ["query"] },
  { area: "Rebanho", estilo: "especifico", texto: "historico da Mimosa", aceita: ["animais", "reproducao", "saude_sanitario", "observacoes"], acoes: ["query"] },

  // --- Producao de leite ---
  { area: "Producao", estilo: "direto", texto: "a vaca 090 deu 25 litros hoje", aceita: ["producao_leite"], acoes: ["create", "execute"] },
  { area: "Producao", estilo: "giria", texto: "lanca ai 30l da kelly", aceita: ["producao_leite"], acoes: ["create", "execute"] },
  { area: "Producao", estilo: "incompleto", texto: "a mimosa deu leite", aceita: ["producao_leite"], acoes: ["clarify", "create", "execute"] },
  { area: "Producao", estilo: "consulta", texto: "quanto de leite tirei essa semana", aceita: ["producao_leite"], acoes: ["query"] },

  // --- Estoque ---
  { area: "Estoque", estilo: "direto", texto: "mostra meu estoque", aceita: ["estoque"], acoes: ["query"] },
  { area: "Estoque", estilo: "entrada", texto: "entrou 10 sacos de racao", aceita: ["estoque"], acoes: ["create", "execute"] },
  { area: "Estoque", estilo: "saida", texto: "usei 20kg de racao hoje", aceita: ["estoque"], acoes: ["create", "execute"] },
  { area: "Estoque", estilo: "typo", texto: "qto tem de raçao?", aceita: ["estoque"], acoes: ["query"] },

  // --- Financeiro ---
  { area: "Financeiro", estilo: "direto", texto: "resumo do financeiro", aceita: ["financeiro"], acoes: ["query"] },
  { area: "Financeiro", estilo: "periodo", texto: "transacoes financeiras do ultimo mes", aceita: ["financeiro"], acoes: ["query"] },
  { area: "Financeiro", estilo: "despesa", texto: "gastei 300 com veterinario", aceita: ["financeiro"], acoes: ["create", "execute"] },
  { area: "Financeiro", estilo: "receita", texto: "recebi 2500 do leite", aceita: ["financeiro"], acoes: ["create", "execute"] },

  // --- Venda cruzada: estoque + financeiro ---
  { area: "VendaCruzada", estilo: "direto", texto: "vendi 4kg de racao por 320 reais", aceita: ["estoque", "financeiro"], acoes: ["sequence", "create", "execute"] },
  { area: "VendaCruzada", estilo: "compra", texto: "comprei 10 sacos de racao por 500 reais", aceita: ["estoque", "financeiro"], acoes: ["sequence", "create", "execute"] },
  { area: "VendaCruzada", estilo: "sem_preco", texto: "vendi 2 bezerros", aceita: ["estoque", "financeiro", "animais"], acoes: ["clarify", "sequence", "create", "execute"] },

  // --- Funcionarios e ponto ---
  { area: "Funcionarios", estilo: "direto", texto: "quais sao meus funcionarios", aceita: ["funcionarios"], acoes: ["query"] },
  { area: "Funcionarios", estilo: "pagamento", texto: "paguei 2000 de salario pro Joao", aceita: ["funcionarios", "financeiro"], acoes: ["create", "execute", "sequence"] },
  { area: "Ponto", estilo: "direto", texto: "Joao entrou as 7:30", aceita: ["ponto_funcionario"], acoes: ["create", "execute"] },

  // --- Saude e vacina ---
  { area: "Saude", estilo: "direto", texto: "vacinei a vaca 090 contra aftosa", aceita: ["saude_sanitario", "estoque"], acoes: ["create", "execute", "sequence"] },
  { area: "Saude", estilo: "observacao", texto: "a Mimosa ta mancando", aceita: ["saude_sanitario", "observacoes"], acoes: ["create", "execute"] },
  { area: "Saude", estilo: "giria", texto: "tem uma vaca ruim no curral", aceita: ["saude_sanitario", "observacoes", "animais"], acoes: ["create", "execute", "clarify"] },

  // --- Reproducao ---
  { area: "Reproducao", estilo: "direto", texto: "090 pariu", aceita: ["reproducao"], acoes: ["create", "execute", "clarify"] },
  { area: "Reproducao", estilo: "consulta", texto: "quais vacas tao prenhas?", aceita: ["reproducao", "animais"], acoes: ["query"] },
  { area: "Reproducao", estilo: "inseminacao", texto: "inseminei a 205 ontem", aceita: ["reproducao"], acoes: ["create", "execute"] },

  // --- Genealogia ---
  { area: "Genealogia", estilo: "direto", texto: "qual a cria da mimosa?", aceita: ["genealogia", "reproducao", "animais"], acoes: ["query"] },
  { area: "Genealogia", estilo: "ascendencia", texto: "quem e a mae da vaca 090", aceita: ["genealogia", "animais"], acoes: ["query"] },

  // --- Lotes ---
  { area: "Lotes", estilo: "consulta", texto: "quais vacas tao no lote lactacao 1", aceita: ["animais", "lotes"], acoes: ["query"] },

  // --- Relatorios ---
  { area: "Relatorio", estilo: "direto", texto: "resumo do dia", aceita: ["observacoes", "animais", "producao_leite", "financeiro"], acoes: ["query"] },

  // --- Conversa: nao deve virar operacao nem erro ---
  { area: "Conversa", estilo: "saudacao", texto: "oi", aceita: [null], acoes: ["clarify"] },
  { area: "Conversa", estilo: "agradecimento", texto: "obrigado", aceita: [null], acoes: ["clarify"] },
  { area: "Conversa", estilo: "capacidade", texto: "o que voce faz?", aceita: [null], acoes: ["clarify", "query"] },

  // --- Fora de escopo: deve explicar, nao dar erro tecnico ---
  { area: "ForaEscopo", estilo: "sem_tabela", texto: "o trator quebrou", aceita: [null, "observacoes", "agenda_tarefas"], acoes: ["clarify", "create", "execute"] }
];

// Em action=execute quem identifica a operacao e a capability, nao o dominio:
// o dominio vem null por contrato. Este mapa liga area -> capabilities validas.
const CAPABILITIES_POR_AREA = {
  Estoque: ["registrar_movimento_estoque", "cadastrar_item_estoque"],
  Financeiro: ["registrar_financeiro"],
  VendaCruzada: ["registrar_movimento_estoque", "registrar_financeiro"],
  Funcionarios: ["registrar_pagamento_funcionario", "cadastrar_funcionario", "atualizar_funcionario"],
  Ponto: ["registrar_ponto_funcionario"],
  Producao: ["registrar_producao_leite"],
  Saude: ["registrar_evento_animal"],
  Reproducao: ["registrar_evento_animal", "atualizar_animal", "atualizar_genealogia"],
  Rebanho: ["cadastrar_animal", "atualizar_animal", "consultar_rebanho", "consultar_animal"],
  ForaEscopo: ["registrar_ordem_servico", "registrar_evento_animal"]
};

function avaliar(caso, plan) {
  if (!plan) return { ok: false, motivo: "sem ActionPlan" };
  const acao = plan.action;
  const dominio = "domain" in plan && plan.domain ? plan.domain : null;
  const capability = plan.capability || null;

  if (acao === "block") return { ok: false, motivo: "bloqueou pedido legitimo" };
  if (!caso.acoes.includes(acao)) {
    return { ok: false, motivo: `acao ${acao}, esperava ${caso.acoes.join("/")}` };
  }
  if (acao === "sequence" || acao === "clarify") return { ok: true, acao, dominio, capability };
  if (acao === "execute") {
    const validas = CAPABILITIES_POR_AREA[caso.area] || [];
    if (!capability) return { ok: false, motivo: "execute sem capability" };
    if (validas.length && !validas.includes(capability)) {
      return { ok: false, motivo: `capability ${capability}, esperava ${validas.join("/")}` };
    }
    return { ok: true, acao, dominio, capability };
  }
  if (!caso.aceita.includes(dominio)) {
    return { ok: false, motivo: `dominio ${dominio}, esperava ${caso.aceita.filter(Boolean).join("/")}` };
  }
  return { ok: true, acao, dominio, capability };
}

/**
 * Venda/compra de item fisico precisa mexer em estoque E financeiro. Isso pode
 * vir como sequence, ou como um unico plano com gera_financeiro=true. Checado
 * a parte porque e o caso que o usuario mais depende no dia a dia.
 */
function checaEstoqueMaisFinanceiro(plan) {
  if (!plan) return "sem plano";
  if (plan.action === "sequence") return `sequence com ${(plan.steps || []).length} passos`;
  const data = plan.data || {};
  const geraFinanceiro = data.gera_financeiro === true || data.gera_financeiro === "true";
  const temValor = data.valor !== undefined || data.valor_total !== undefined;
  if (geraFinanceiro) return `plano unico com gera_financeiro=true, valor=${data.valor ?? data.valor_total ?? "ausente"}`;
  return `ATENCAO: plano unico SEM gera_financeiro (valor=${temValor ? "presente" : "ausente"})`;
}

(async () => {
  console.log("Teste de interpretacao com IA real - todas as areas");
  console.log(`Modelo: ${process.env.BOT_AI_MODEL || "default"}`);
  console.log(`Casos: ${CASOS.length}\n`);

  const falhas = [];
  let ok = 0;

  for (const caso of CASOS) {
    let plan = null;
    let erro = null;
    try {
      const resultado = await interpretWithGemini({
        text: caso.texto,
        currentDate: new Date().toISOString().slice(0, 10),
        timezone: "America/Sao_Paulo"
      });
      if (resultado.ok) plan = resultado.interpretation.action_plan;
      else erro = resultado.reason;
    } catch (error) {
      erro = error instanceof Error ? error.message : "excecao";
    }

    const avaliacao = erro ? { ok: false, motivo: `interpretacao falhou: ${erro}` } : avaliar(caso, plan);
    const marca = avaliacao.ok ? "OK  " : "FALHA";
    const detalhe = avaliacao.ok
      ? `${avaliacao.acao}${avaliacao.dominio ? `/${avaliacao.dominio}` : ""}${avaliacao.capability ? `/${avaliacao.capability}` : ""}`
      : avaliacao.motivo;
    console.log(`${marca} [${caso.area}/${caso.estilo}] "${caso.texto}" -> ${detalhe}`);
    if (caso.area === "VendaCruzada" && caso.estilo !== "sem_preco") {
      console.log(`       cruzamento estoque+financeiro: ${checaEstoqueMaisFinanceiro(plan)}`);
    }

    if (avaliacao.ok) ok += 1;
    else falhas.push({ ...caso, motivo: avaliacao.motivo, plan });
  }

  console.log(`\n===== RESULTADO: ${ok}/${CASOS.length} =====`);

  if (falhas.length) {
    console.log("\n--- FALHAS AGRUPADAS POR AREA ---");
    const porArea = {};
    for (const falha of falhas) {
      porArea[falha.area] = porArea[falha.area] || [];
      porArea[falha.area].push(falha);
    }
    for (const [area, itens] of Object.entries(porArea)) {
      console.log(`\n[${area}] ${itens.length} falha(s)`);
      for (const item of itens) {
        console.log(`  "${item.texto}" (${item.estilo})`);
        console.log(`    ${item.motivo}`);
        if (item.plan) {
          console.log(`    plano: ${JSON.stringify({
            action: item.plan.action,
            domain: "domain" in item.plan ? item.plan.domain : null,
            filters: item.plan.filters || null,
            capability: item.plan.capability || null
          })}`);
        }
      }
    }
  }
})();
