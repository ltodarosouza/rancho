import type { AnyRecord } from "@/lib/types";
import { generateStructuredAI, parseJsonObjectText, providerApiKeyConfigured } from "@/lib/whatsapp/ai-provider";
import { polishBotResponse } from "@/lib/whatsapp/user-facing-text";
import type { ParsedRanchoMessage } from "@/lib/whatsapp/nlp";
import type { BotSession } from "@/services/whatsapp/session-service";

export type ComposeBotResponseInput = {
  response: string;
  userMessage: string;
  parsed?: ParsedRanchoMessage | null;
  previousSession?: BotSession | null;
  nextSession?: BotSession | null;
  eventConfirmed?: boolean;
  modoTeste?: boolean;
};

export type ComposeBotResponseResult = {
  response: string;
  usedAI: boolean;
  reason?: string;
};

type BotResponseComposition = {
  type: "bot_response_composition";
  confidence: number;
  message: string;
};

const MAX_RESPONSE_TO_COMPOSE = 6000;
const MIN_RESPONSE_TO_COMPOSE = 35;
const TECHNICAL_TERMS = /\b(?:action_plan|ActionPlan|route|legacy|fallback|fixture|mock|parser|gemini|openrouter|debug)\b/i;
const CONFIRMED_SAVE_RE = /\b(?:salv[eo]i?|registrei|cadastrei|importei|movimentei|dei baixa|lancei|lan[çc]ei)\b/i;
const NOT_SAVED_RE = /\b(?:n[ãa]o foi salvo|nenhum(?:a)? .*salvo|nada foi salvo|nenhum registro real foi salvo|sem salvar|antes de salvar|pr[eé]-valida[çc][ãa]o|preview|pr[eé]via|est[aá] correto|confirmar)\b/i;

function automatedTestBlocksComposer() {
  return process.env.NODE_ENV === "test" || process.env.RANCHO_BOT_TEST === "1";
}

function responseComposerEnabled() {
  const raw = String(process.env.BOT_RESPONSE_COMPOSER_ENABLED || "").trim().toLowerCase();
  if (["0", "false", "off", "nao", "não"].includes(raw)) return false;
  if (["1", "true", "on", "sim"].includes(raw)) return true;
  return true;
}

function mandatoryLines(response: string) {
  return response
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d+\s*-\s+\S+/.test(line));
}

function mandatoryRecordLines(response: string) {
  return response
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d+[.)]\s+\S+/.test(line));
}

function mandatoryInstructionLines(response: string) {
  return response
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => (
      /codigo[_\s]da[_\s]mae.*codigo[_\s]da[_\s]cria.*sexo[_\s]da[_\s]cria/i.test(line) ||
      /como complementar crias antes de importar/i.test(line) ||
      /envie uma ou mais linhas/i.test(line) ||
      /exemplo sem cadastrar cria/i.test(line)
    ));
}

function normalizeComparable(value: string) {
  return polishBotResponse(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function includesComparable(text: string, expected: string) {
  return normalizeComparable(text).includes(normalizeComparable(expected));
}

function normalizeVisibleResponse(value: unknown) {
  const polished = polishBotResponse(value)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!polished) return "";

  // Remove apenas blocos consecutivos idênticos. Linhas repetidas dentro de
  // listas podem representar registros diferentes e devem ser preservadas.
  const blocks = polished.split(/\n{2,}/);
  const uniqueBlocks: string[] = [];
  for (const block of blocks) {
    const normalized = normalizeComparable(block);
    if (!normalized) continue;
    const previous = uniqueBlocks[uniqueBlocks.length - 1];
    if (previous && normalizeComparable(previous) === normalized) continue;
    uniqueBlocks.push(block.trim());
  }
  return uniqueBlocks.join("\n\n");
}

function hasFinalSuccessLanguage(value: string) {
  const normalized = normalizeComparable(value);
  return /\b(?:concluid[ao]|salv[ao]|registrad[ao]|cadastrad[ao]|importad[ao]|criad[ao]|movimentacoes registradas)\b/.test(normalized);
}

function hasProblemLanguage(value: string) {
  const normalized = normalizeComparable(value);
  return /\b(?:nao encontrad|faltant|pendencia|cadastre|nao consegui|nao foi possivel|revise|tente novamente|nao foram processad|nao foi processad)\b/.test(normalized);
}

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Ruido interno que nao ajuda o modelo a escrever e ainda vaza implementacao. */
const TECHNICAL_DATA_KEYS = new Set([
  "route",
  "structuredDetection",
  "origem_parser",
  "interpreter_final_usado",
  "action_plan",
  "action_plan_used",
  "action_plan_response",
  "action_plan_pagination",
  "consulta",
  "consulta_paginacao",
  "resultado",
  "linhas",
  "linhas_validadas",
  "linhas_prontas",
  "linhas_invalidas",
  "linhas_parse_invalidas",
  "amostra",
  "pending",
  "debug",
  "tabela_destino",
  "column_mapping",
  "instrucoes_confirmacao"
]);

function compactValueForPrompt(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  // Identificador interno nao diz nada ao produtor e nao pode virar resposta.
  if (typeof value === "string" && UUID_RE.test(value)) return undefined;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (depth >= 3) return undefined;
  if (Array.isArray(value)) {
    return value.slice(0, 12).map((item) => compactValueForPrompt(item, depth + 1)).filter((item) => item !== undefined);
  }
  if (typeof value === "object") {
    const output: AnyRecord = {};
    for (const [key, item] of Object.entries(value as AnyRecord).slice(0, 24)) {
      if (/token|secret|senha|password|service_role|api_key/i.test(key)) continue;
      const compacted = compactValueForPrompt(item, depth + 1);
      if (compacted !== undefined && compacted !== "") output[key] = compacted;
    }
    return Object.keys(output).length ? output : undefined;
  }
  return undefined;
}

function compactRowsForPrompt(parsed?: ParsedRanchoMessage | null) {
  const rows = parsed?.dados?.linhas_validadas || parsed?.dados?.linhas;
  if (!Array.isArray(rows)) return null;
  const compacted = rows.slice(0, 10).map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return null;
    const record = row as AnyRecord;
    const output: AnyRecord = {};
    for (const key of [
      "lineNumber",
      "animal_codigo",
      "evento_label",
      "evento_tipo",
      "data_referencia",
      "child_status",
      "cria_sexo",
      "cria_codigo",
      "pai_ref",
      "status_validacao",
      "status_linha",
      "problemas_validacao",
      "avisos"
    ]) {
      const value = record[key];
      if (value !== undefined && value !== null && value !== "") output[key] = compactValueForPrompt(value, 1);
    }
    return Object.keys(output).length ? output : null;
  }).filter(Boolean);
  return compacted.length ? compacted : null;
}

function compactDataForPrompt(parsed?: ParsedRanchoMessage | null, options: { eventConfirmed?: boolean } = {}) {
  if (options.eventConfirmed) return null;
  if (!parsed?.dados) return null;
  const dados = parsed.dados as AnyRecord;
  const compact: AnyRecord = {};
  // Antes daqui saia uma lista fixa de 16 chaves, entao turno, peso, raca, mae
  // e qualquer campo novo nunca chegavam a quem escreve a resposta, mesmo tendo
  // sido interpretados corretamente. Agora o corte e pelo que e ruido tecnico,
  // nao pelo que alguem lembrou de listar.
  for (const [key, value] of Object.entries(dados)) {
    if (TECHNICAL_DATA_KEYS.has(key)) continue;
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "object") continue;
    compact[key] = value;
  }
  for (const key of ["resumo_partos", "resumo_validacao"]) {
    if (dados[key] !== undefined && dados[key] !== null && dados[key] !== "") compact[key] = dados[key];
  }
  const result = compactValueForPrompt(dados.resultado);
  if (result && typeof result === "object" && !Array.isArray(result)) {
    const safeResult = { ...(result as AnyRecord) };
    // The sample always starts at the first row and can corrupt later pages.
    // linhas_pagina carries the exact rows of the answered page instead.
    delete safeResult.amostra;
    if (Object.keys(safeResult).length) compact.resultado = safeResult;
  }
  const actionPlan = dados.action_plan;
  if (actionPlan && typeof actionPlan === "object" && !Array.isArray(actionPlan)) {
    const plan = actionPlan as AnyRecord;
    const semantic = plan.semantic && typeof plan.semantic === "object" ? plan.semantic as AnyRecord : {};
    const report = semantic.report && typeof semantic.report === "object" ? semantic.report as AnyRecord : {};
    compact.apresentacao_consulta = {
      operation: plan.operation || semantic.operation || null,
      reportType: report.type || null,
      detailLevel: report.detailLevel || null
    };
  }
  const rows = compactRowsForPrompt(parsed);
  if (rows) compact.linhas_resumidas = rows;
  return Object.keys(compact).length ? compact : null;
}

/**
 * Consulta sem resultado. Nesses casos a frase do backend e generica
 * ("nao ha mais X para mostrar") e nao diz o que foi procurado. O compositor
 * tem os filtros e consegue explicar, entao vale compor mesmo em texto curto.
 */
function isEmptyQueryResult(input: ComposeBotResponseInput) {
  const resultado = input.parsed?.dados?.resultado as AnyRecord | undefined;
  if (!resultado || typeof resultado !== "object") return false;
  if (!input.parsed?.dados?.consulta) return false;
  return Number(resultado.registros || 0) === 0;
}

function shouldTryAIComposition(input: ComposeBotResponseInput) {
  const response = String(input.response || "").trim();
  if (!response) return false;
  if (!responseComposerEnabled()) return false;
  if (automatedTestBlocksComposer()) return false;
  if (!providerApiKeyConfigured()) return false;
  if (response.length > MAX_RESPONSE_TO_COMPOSE) return false;
  if (/erro interno|instabilidade para interpretar/i.test(response)) return false;
  if (isEmptyQueryResult(input)) return true;
  if (response.length < MIN_RESPONSE_TO_COMPOSE) return false;
  return Boolean(input.parsed?.tipo || mandatoryLines(response).length || response.length >= 120);
}

function buildResponseComposerPrompt(input: ComposeBotResponseInput) {
  const options = mandatoryLines(input.response);
  const records = mandatoryRecordLines(input.response);
  const instructions = mandatoryInstructionLines(input.response);
  const context = {
    userMessage: input.userMessage,
    intent: input.parsed?.tipo || null,
    confidence: input.parsed?.confianca || null,
    previousState: input.previousSession?.etapa || null,
    nextState: input.nextSession?.etapa || null,
    eventConfirmed: Boolean(input.eventConfirmed),
    missingFields: input.parsed?.perguntas_faltantes || [],
    extractedData: compactDataForPrompt(input.parsed, { eventConfirmed: input.eventConfirmed }),
    mandatoryOptionLines: options,
    mandatoryRecordLines: records,
    mandatoryInstructionLines: instructions,
    originalResponse: normalizeVisibleResponse(input.response)
  };

  return [
    "Voce e o compositor de respostas do bot Rancho.",
    "Sua tarefa e reescrever a resposta validada pelo backend em portugues natural, claro e profissional.",
    "Retorne somente JSON. Nao retorne markdown fora do JSON.",
    "",
    "Regras rigidas:",
    "- Use somente os fatos presentes em originalResponse e extractedData.",
    "- Em consultas, originalResponse e extractedData.resultado.linhas_pagina sao a fonte de verdade sobre quais registros pertencem a esta resposta e a esta pagina. Nao troque, repita nem acrescente registros usando outros dados do contexto, e nunca use resultado.amostra.",
    "- Numeros, totais, somas, saldos e contagens ja vem calculados pelo backend. Copie-os como estao; nunca recalcule, estime ou some por conta propria.",
    "- Consulta sem resultado (resultado.registros = 0): nao responda apenas que nao ha nada. Diga em linguagem natural o que foi procurado, com base em resultado.filters e no periodo consultado, e ofereca o proximo passo util. Nunca use a palavra 'mais' sugerindo que existiam registros anteriores quando registros = 0.",
    "- Responda primeiro e diretamente a pergunta que o usuario realmente fez em userMessage. Nao comece sempre com 'Entendi que voce quer'; prefira uma resposta natural e objetiva.",
    "- Se o backend trouxe os dados em um recorte diferente do pedido, por exemplo outro periodo ou outro animal, diga claramente qual recorte foi consultado e nao apresente esse resultado como se fosse o pedido original.",
    "- Sempre deixe explicito o recorte consultado. Com filtro de periodo em resultado.filters, diga o periodo, por exemplo \"Resumo financeiro de julho de 2026\". Sem nenhum filtro de periodo, diga que o resumo cobre todos os registros, por exemplo \"Resumo financeiro de todos os lancamentos\". Nunca entregue apenas \"Resumo financeiro\": o usuario precisa perceber na hora se o recorte nao foi o que ele queria.",
    "- Seja completo por padrao: inclua todos os fatos disponiveis em originalResponse e extractedData sobre o que foi perguntado, como data, animal envolvido, cria, pai, valores e observacoes. Nao resuma a ponto de omitir dado que existe, mas tambem nao acrescente exemplos ou detalhes que o usuario nao pediu.",
    "- Excecao a regra acima: se resultado.campos_pedidos existir, o usuario pediu campos especificos. Mostre apenas esses campos de cada registro, sem acrescentar os demais, mesmo que estejam disponiveis.",
    "- Resumo e lista detalhada sao modos diferentes. Se originalResponse for um resumo, nao acrescente exemplos, amostras ou transacoes que nao estejam escritos nela.",
    "- Nao invente dados, valores, codigos, animais, datas, permissoes ou salvamentos.",
    "- Nao altere a acao definida pelo backend.",
    "- Para uma acao concluida, comece pelo resultado efetivo e depois mostre os detalhes relevantes. Para uma acao pendente, deixe claro que nada foi salvo ainda e o que falta confirmar.",
    "- Para uma consulta, entregue a resposta pedida antes de observacoes complementares. Nao troque uma consulta especifica por um resumo geral e nao use uma amostra como se fosse a lista completa.",
    "- Quando nao houver resultado, diga o que foi procurado, quais filtros foram usados e qual proximo passo o usuario pode tentar.",
    "- Em mensagens compostas, separe cada assunto em um bloco com titulo curto e mantenha a ordem em que o usuario pediu. Nao misture consulta com salvamento.",
    "- Em erros, permissoes ou validacoes, explique o problema em linguagem do cliente e diga exatamente como continuar. Nunca exponha detalhes internos nem devolva apenas uma frase generica quando houver uma orientacao segura.",
    "- Evite repeticoes: nao repita saudacao, resumo, lista ou bloco de instrucoes. Cada fato deve aparecer uma vez, no lugar mais claro.",
    "- Use datas no padrao brasileiro DD/MM/AAAA, valores em R$ e unidades junto das quantidades. Preserve codigos, nomes e numeros calculados pelo backend.",
    "- Quando uma dependencia nao for encontrada, separe claramente: o que nao foi encontrado, o que sera registrado mesmo assim e quais opcoes o usuario tem para continuar.",
    "- Em escolhas entre registrar somente o evento e tambem movimentar estoque/financeiro, diga explicitamente o que cada opcao salva e o que nao altera.",
    "- Para opcoes numeradas, use uma pergunta direta, descreva o efeito de cada opcao e finalize pedindo uma resposta pelo numero.",
    "- Formate todo valor monetario em real brasileiro, por exemplo R$ 1.234,56. Nunca remova o simbolo, os separadores ou as duas casas decimais.",
    "- Quando eventConfirmed for true, originalResponse e a fonte da verdade sobre o que foi salvo. Nao use dados de pre-validacao antigos para criar pendencias.",
    "- Nao diga que salvou, registrou, cadastrou ou importou se originalResponse estiver pedindo confirmacao ou dizendo que nada foi salvo.",
    "- Se houver mandatoryOptionLines, copie essas linhas exatamente como estao.",
    "- Se houver mandatoryRecordLines, preserve cada registro exatamente; voce pode apenas ajustar a organizacao ao redor deles.",
    "- Se houver mandatoryInstructionLines, preserve essas instrucoes de forma clara. O formato de complementacao de crias deve aparecer explicitamente.",
    "- Organize respostas longas em blocos curtos, por exemplo: Resumo, Partos, Como complementar, Opcoes.",
    "- Em importacoes de tabelas, explique primeiro o que foi lido, depois pendencias/opcoes, e por ultimo as opcoes numeradas.",
    "- Em importacoes com partos, separe os partos com cria completa, sem cria e com dados faltando. Nao esconda a possibilidade de enviar crias por linhas.",
    "- Em respostas finais de salvamento, separe o que foi salvo por area quando houver mais de um resultado.",
    "- Seja claro, escaneavel e educado. Use frases curtas e blocos bem separados, mas preserve todos os dados que respondem ao pedido.",
    "- Remova termos tecnicos internos como action_plan, route, parser, mock, fixture, fallback ou debug.",
    "",
    "Contrato JSON:",
    JSON.stringify({
      type: "bot_response_composition",
      confidence: 0.9,
      message: "Texto final para o usuario"
    }, null, 2),
    "",
    "Contexto validado pelo backend:",
    JSON.stringify(context, null, 2)
  ].join("\n");
}

function normalizeComposition(value: unknown): BotResponseComposition | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as AnyRecord;
  if (record.type !== "bot_response_composition") return null;
  const message = String(record.message || "").trim();
  const confidence = Number(record.confidence || 0);
  if (!message || !Number.isFinite(confidence)) return null;
  return {
    type: "bot_response_composition",
    confidence,
    message
  };
}

export function validateComposedBotResponse(originalResponse: string, composed: unknown): ComposeBotResponseResult {
  const original = normalizeVisibleResponse(originalResponse);
  const composition = normalizeComposition(composed);
  if (!composition) return { response: original, usedAI: false, reason: "invalid_contract" };
  if (composition.confidence < 0.72) return { response: original, usedAI: false, reason: "low_confidence" };

  const message = normalizeVisibleResponse(composition.message);
  if (!message) return { response: original, usedAI: false, reason: "empty_message" };
  if (message.length > Math.max(900, original.length * 2.2)) {
    return { response: original, usedAI: false, reason: "too_long" };
  }
  if (TECHNICAL_TERMS.test(message) && !TECHNICAL_TERMS.test(original)) {
    return { response: original, usedAI: false, reason: "technical_term_leak" };
  }
  // Ultima barreira: se um identificador interno escapou ate aqui, a resposta
  // composta e descartada em vez de mostrar UUID ao usuario.
  if (UUID_RE.test(message)) {
    return { response: original, usedAI: false, reason: "internal_id_leak" };
  }
  if (hasFinalSuccessLanguage(original) && !hasProblemLanguage(original) && hasProblemLanguage(message)) {
    return { response: original, usedAI: false, reason: "introduced_problem_language" };
  }

  for (const line of mandatoryLines(original)) {
    if (!includesComparable(message, line)) {
      return { response: original, usedAI: false, reason: "missing_mandatory_option" };
    }
  }

  for (const line of mandatoryRecordLines(original)) {
    if (!includesComparable(message, line)) {
      return { response: original, usedAI: false, reason: "missing_mandatory_record" };
    }
  }

  for (const line of mandatoryInstructionLines(original)) {
    if (!includesComparable(message, line)) {
      return { response: original, usedAI: false, reason: "missing_mandatory_instruction" };
    }
  }

  if (NOT_SAVED_RE.test(original) && CONFIRMED_SAVE_RE.test(message) && !NOT_SAVED_RE.test(message)) {
    return { response: original, usedAI: false, reason: "unsafe_save_claim" };
  }

  return { response: message, usedAI: true };
}

export async function composeBotResponseWithAI(input: ComposeBotResponseInput): Promise<ComposeBotResponseResult> {
  const fallback = normalizeVisibleResponse(input.response);
  if (!shouldTryAIComposition(input)) return { response: fallback, usedAI: false, reason: "skipped" };

  try {
    const generated = await generateStructuredAI({
      purpose: "response_composer",
      userPrompt: buildResponseComposerPrompt(input),
      temperature: 0.2,
      maxTokens: 900
    });
    if (!generated.ok) return { response: fallback, usedAI: false, reason: generated.reason };
    const validation = validateComposedBotResponse(fallback, parseJsonObjectText(generated.rawText));
    console.log("[BOT RESPONSE COMPOSER]", {
      event: validation.usedAI ? "response_composer_used" : "response_composer_rejected",
      reason: validation.reason || null,
      originalLength: fallback.length,
      finalLength: validation.response.length
    });
    return validation;
  } catch (error) {
    console.warn("[BOT RESPONSE COMPOSER]", {
      event: "response_composer_error",
      message: error instanceof Error ? error.message : "erro desconhecido"
    });
    return { response: fallback, usedAI: false, reason: "exception" };
  }
}
