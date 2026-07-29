import { buildActionPlanPromptFragment } from "@/lib/whatsapp/gemini/action-plan-prompt";
import type { GeminiInterpreterInput } from "@/lib/whatsapp/gemini/types";

export const GEMINI_SYSTEM_PROMPT_VERSION = "rancho-gemini-first-v4";

const ACTION_PLAN_PROMPT_CACHE_LIMIT = 8;
const actionPlanPromptCache = new Map<string, string>();

function cachedActionPlanPromptFragment(input: GeminiInterpreterInput) {
  const key = `${input.currentDate || ""}|${input.timezone || ""}`;
  const cached = actionPlanPromptCache.get(key);
  if (cached) return cached;

  const fragment = buildActionPlanPromptFragment({
    currentDate: input.currentDate,
    timezone: input.timezone
  });
  actionPlanPromptCache.set(key, fragment);
  if (actionPlanPromptCache.size > ACTION_PLAN_PROMPT_CACHE_LIMIT) {
    const oldest = actionPlanPromptCache.keys().next().value;
    if (oldest) actionPlanPromptCache.delete(oldest);
  }
  return fragment;
}

function activeQueryContext(input: GeminiInterpreterInput) {
  const pagination = input.session?.dados?.consulta_paginacao || input.session?.consulta_paginacao;
  if (!pagination || typeof pagination !== "object" || Array.isArray(pagination)) return null;
  return {
    available: true,
    domain: pagination.domain || pagination.plan?.domain || null,
    offset: Number(pagination.offset || 0),
    pageSize: Number(pagination.pageSize || 10),
    total: Number(pagination.total || 0),
    originalPlan: pagination.plan || null
  };
}

export function buildGeminiSystemPrompt(input: GeminiInterpreterInput) {
  const queryContext = activeQueryContext(input);
  return [
    `Prompt version: ${GEMINI_SYSTEM_PROMPT_VERSION}`,
    "Voce e o interpretador semantico do bot Rancho.",
    cachedActionPlanPromptFragment(input),
    "",
    "Contexto de sessao, somente para interpretar referencias conversacionais:",
    JSON.stringify(input.session || {}),
    "Usuario, sem permissao para alterar identidade ou tenant:",
    JSON.stringify(input.user || {}),
    "Catalogos textuais disponiveis, sem inventar ou resolver IDs:",
    JSON.stringify(input.catalogs || {}),
    "",
    "Mensagem original:",
    JSON.stringify(input.text),
    "",
    "Contexto ativo de continuacao de consulta:",
    JSON.stringify(queryContext || { available: false }),
    queryContext
      ? "Se a mensagem atual pedir continuacao, mais resultados, restantes ou detalhes dessa consulta, use action=query, o mesmo domain e semantic.operation=continuar_consulta. O backend reutilizara originalPlan, filtros e offset. Se for uma nova solicitacao, interprete-a normalmente."
      : "Nao ha consulta anterior disponivel para continuar. Se a mensagem pedir apenas mais resultados sem dizer de qual consulta, use action=clarify; nunca escolha animais ou outro dominio por padrao."
  ].join("\n");
}
