import { aiProviderLog, generateStructuredAI, parseJsonObjectText } from "@/lib/whatsapp/ai-provider";
import { botTestVerbose, geminiActionPlanEnabled } from "@/lib/whatsapp/gemini/config";
import { buildGeminiSystemPrompt } from "@/lib/whatsapp/gemini/system-prompt";
import { validateInterpretedAction } from "@/lib/whatsapp/gemini/validator";
import { RANCHO_DOMAIN_MANIFEST, summarizeDomainManifestForPrompt } from "@/lib/whatsapp/gemini/domain-manifest";
import {
  findGeminiMockFixture,
  geminiMode,
  recordGeminiMockCall,
  unknownGeminiMockResponse
} from "@/lib/whatsapp/gemini/runtime";
import type {
  GeminiInterpreterInput,
  GeminiInterpreterResult
} from "@/lib/whatsapp/gemini/types";

type GeminiMockGlobal = typeof globalThis & {
  __RANCHO_GEMINI_INTERPRETER_MOCK__?: (input: GeminiInterpreterInput) => unknown | Promise<unknown>;
};

function geminiInterpreterLog(event: string, details: Record<string, unknown>) {
  console.log("[BOT GEMINI INTERPRETER]", {
    event,
    ...details
  });
}

function isRepairableActionPlanContractError(reason: unknown) {
  const text = String(reason || "");
  if (!text) return false;
  if (/\b(?:delete|sql|perigoso|segredo|senha|token|api|escopo|massa|bloqueado|blocked)\b/i.test(text)) return false;
  return /\b(?:invalid_json|invalid_schema|schema|contract|contrato|intent|intencao|action|acao|steps|sequence|requiresConfirmation|domain|dominio|manifest|field|campo|table|tabela|column|coluna|columnMapping|import_table|semantic\.domains|semantic\.effects)\b/i.test(text);
}

function buildActionPlanRepairPrompt(input: GeminiInterpreterInput, originalJson: unknown, reason: string) {
  return [
    "Corrija o ActionPlan do bot Rancho.",
    "",
    "Voce deve devolver SOMENTE um objeto JSON valido. Pode ser o ActionPlan direto ou {\"action_plan\": {...}}.",
    "Nao altere a intencao do usuario. Nao invente dados. Nao execute delete. Mutacoes precisam de requiresConfirmation=true. Consultas precisam de requiresConfirmation=false.",
    "Se o erro for nome de dominio/tabela/campo, escolha o dominio e os campos canonicos mais adequados pelo contrato abaixo.",
    "",
    `Mensagem do usuario: ${JSON.stringify(input.text)}`,
    `Erro de validacao: ${reason}`,
    "",
    "Dominios e campos permitidos:",
    JSON.stringify(summarizeDomainManifestForPrompt(RANCHO_DOMAIN_MANIFEST)),
    "",
    "JSON original a corrigir:",
    JSON.stringify(originalJson)
  ].join("\n");
}

async function tryRepairActionPlanContract(
  input: GeminiInterpreterInput,
  originalJson: unknown,
  reason: string
) {
  if (!isRepairableActionPlanContractError(reason)) return null;

  const generated = await generateStructuredAI({
    purpose: "action_plan",
    userPrompt: buildActionPlanRepairPrompt(input, originalJson, reason),
    temperature: 0,
    maxTokens: 4096,
    requestId: input.geminiMockId ? `${input.geminiMockId}:repair` : undefined
  });

  if (!generated.ok) {
    geminiInterpreterLog("action_plan_repair_failed", {
      reason: generated.reason,
      status: generated.status || null,
      message: generated.message
    });
    return null;
  }

  let repaired: unknown;
  try {
    repaired = parseJsonObjectText(generated.rawText);
  } catch {
    geminiInterpreterLog("action_plan_repair_failed", {
      provider: generated.provider,
      model: generated.model,
      reason: "invalid_json",
      responseLength: generated.rawText.length
    });
    return null;
  }

  const validation = validateInterpretedAction(repaired, {
    originalText: input.text,
    currentDate: input.currentDate,
    timezone: input.timezone
  });

  if (!validation.ok || validation.value.action_plan_error) {
    geminiInterpreterLog("action_plan_repair_rejected", {
      provider: generated.provider,
      model: generated.model,
      reason: validation.ok ? validation.value.action_plan_error?.reason : validation.reason
    });
    return null;
  }

  geminiInterpreterLog("action_plan_repair_success", {
    provider: generated.provider,
    model: generated.model,
    action: validation.value.action_plan?.action || null,
    domain: validation.value.action_plan && "domain" in validation.value.action_plan ? validation.value.action_plan.domain : null
  });

  return {
    validation,
    rawText: generated.rawText,
    provider: generated.provider,
    model: generated.model
  };
}

async function mockInterpretation(input: GeminiInterpreterInput) {
  const globalMock = (globalThis as GeminiMockGlobal).__RANCHO_GEMINI_INTERPRETER_MOCK__;
  if (globalMock) return globalMock(input);

  if (process.env.BOT_GEMINI_MOCK === "json" && process.env.BOT_GEMINI_MOCK_RESPONSE) {
    return parseJsonObjectText(process.env.BOT_GEMINI_MOCK_RESPONSE);
  }

  return undefined;
}

function validateMockedInterpretation(input: GeminiInterpreterInput, mock: unknown, model = "mock"): GeminiInterpreterResult {
  const validation = validateInterpretedAction(mock, {
    originalText: input.text,
    currentDate: input.currentDate,
    timezone: input.timezone
  });
  if (!validation.ok) {
    return { ok: false, reason: validation.reason === "dangerous_response" ? "dangerous_response" : "invalid_schema", message: validation.message };
  }
  return {
    ok: true,
    interpretation: validation.value,
    model,
    rawText: JSON.stringify(mock),
    validationStatus: validation.status
  };
}

export async function callGeminiInterpreter(input: GeminiInterpreterInput): Promise<GeminiInterpreterResult> {
  if (geminiMode() === "mock") {
    if (input.geminiMockId) {
      const fixture = findGeminiMockFixture({ text: input.text, geminiMockId: input.geminiMockId });
      if (fixture) {
        recordGeminiMockCall(fixture.id);
        return validateMockedInterpretation(input, fixture.response, `mock:${fixture.id}`);
      }
      recordGeminiMockCall("fixture-not-found");
      return validateMockedInterpretation(input, unknownGeminiMockResponse(), "mock:fixture-not-found");
    }

    const mock = await mockInterpretation(input);
    if (mock !== undefined) {
      recordGeminiMockCall("global-or-env-mock");
      return validateMockedInterpretation(input, mock);
    }

    const fixture = findGeminiMockFixture({ text: input.text, geminiMockId: input.geminiMockId });
    if (fixture) {
      recordGeminiMockCall(fixture.id);
      return validateMockedInterpretation(input, fixture.response, `mock:${fixture.id}`);
    }

    recordGeminiMockCall("fixture-not-found");
    return validateMockedInterpretation(input, unknownGeminiMockResponse(), "mock:fixture-not-found");
  }

  const prompt = buildGeminiSystemPrompt({
    ...input
  });

  try {
    const generated = await generateStructuredAI({
      purpose: "action_plan",
      userPrompt: prompt,
      temperature: 0.1,
      requestId: input.geminiMockId || undefined
    });
    let model = generated.model;
    let provider = generated.provider;

    geminiInterpreterLog("request", { provider, model, messageLength: input.text.length });
    if (!generated.ok) {
      if (generated.reason === "invalid_json" && generated.rawText) {
        const repair = await tryRepairActionPlanContract(input, generated.rawText, "invalid_json");
        if (repair) {
          const value = repair.validation.value;
          if (value.action_plan) {
            const plan = value.action_plan;
            geminiInterpreterLog("action_plan_success", {
              provider: repair.provider,
              model: repair.model,
              action: plan.action,
              domain: "domain" in plan ? plan.domain : null,
              confidence: value.confidence
            });
          }
          geminiInterpreterLog("success", {
            provider: repair.provider,
            model: repair.model,
            intent: value.intent,
            confidence: value.confidence,
            riskScore: value.riskScore,
            missingFields: value.missing_fields,
            shouldConfirm: value.should_confirm
          });
          return {
            ok: true,
            interpretation: value,
            model: repair.model,
            rawText: repair.rawText,
            validationStatus: repair.validation.status
          };
        }
      }
      return {
        ok: false,
        reason: generated.reason,
        status: generated.status,
        message: generated.message,
        rawText: generated.rawText
      };
    }

    let rawText = generated.rawText;
    let parsed: unknown;
    try {
      parsed = parseJsonObjectText(rawText);
    } catch {
      geminiInterpreterLog("error", { provider, reason: "invalid_json", model, responseLength: rawText.length });
      return { ok: false, reason: "invalid_json", message: "Interpretador retornou JSON invalido.", rawText };
    }

    let validation = validateInterpretedAction(parsed, {
      originalText: input.text,
      currentDate: input.currentDate,
      timezone: input.timezone
    });

    if (validation.ok && validation.value.action_plan_error) {
      const repair = await tryRepairActionPlanContract(input, parsed, validation.value.action_plan_error.reason);
      if (repair) {
        validation = repair.validation;
        rawText = repair.rawText;
        provider = repair.provider;
        model = repair.model;
      }
    }

    if (!validation.ok && validation.reason === "invalid_schema") {
      const repair = await tryRepairActionPlanContract(input, parsed, validation.message || validation.reason);
      if (repair) {
        validation = repair.validation;
        rawText = repair.rawText;
        provider = repair.provider;
        model = repair.model;
      }
    }

    if (!validation.ok) {
      aiProviderLog("ai_provider_contract_error", {
        provider,
        model,
        purpose: "action_plan",
        requestId: input.geminiMockId || null,
        reason: validation.reason
      });
      geminiInterpreterLog("error", { provider, reason: validation.reason, model, message: validation.message });
      return {
        ok: false,
        reason: validation.reason === "dangerous_response" ? "dangerous_response" : "invalid_schema",
        message: validation.message,
        rawText
      };
    }

    if (botTestVerbose()) {
      geminiInterpreterLog("verbose", {
        prompt,
        rawText,
        validationStatus: validation.status,
        warnings: validation.warnings
      });
    }

    if (validation.value.action_plan) {
      const plan = validation.value.action_plan;
      geminiInterpreterLog("action_plan_success", {
        provider,
        model,
        action: plan.action,
        domain: "domain" in plan ? plan.domain : null,
        confidence: validation.value.confidence
      });
    } else if (geminiActionPlanEnabled() && validation.value.legacy_intent_returned) {
      geminiInterpreterLog("legacy_intent_returned_while_action_plan_enabled", {
        provider,
        model,
        intent: validation.value.intent,
        actionPlanUsed: false,
        fallbackEligible: validation.value.fallback_eligible === true,
        messageLength: input.text.length
      });
    }

    geminiInterpreterLog("success", {
      provider,
      model,
      intent: validation.value.intent,
      confidence: validation.value.confidence,
      riskScore: validation.value.riskScore,
      missingFields: validation.missingFields,
      shouldConfirm: validation.value.should_confirm
    });

    return {
      ok: true,
      model,
      provider,
      rawText,
      interpretation: validation.value,
      validationStatus: validation.status
    };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    const reason = aborted ? "timeout" : "network_error";
    geminiInterpreterLog("error", { reason });
    return {
      ok: false,
      reason,
      message: aborted ? "Tempo esgotado ao chamar Gemini." : "Erro de rede ao chamar Gemini."
    };
  }
}

export async function interpretWithGemini(input: GeminiInterpreterInput): Promise<GeminiInterpreterResult> {
  return callGeminiInterpreter(input);
}

