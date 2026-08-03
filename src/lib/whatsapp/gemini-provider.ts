import type { AnyRecord } from "@/lib/types";
import { parseJsonObjectText, type GenerateStructuredResult, type ProviderRequest } from "@/lib/whatsapp/ai-provider-types";
import { getOrCreateCachedSystemPrompt, invalidateCache } from "@/lib/whatsapp/gemini-cache";
import { recordGeminiLiveCall } from "@/lib/whatsapp/gemini/runtime";

type GeminiApiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
    cachedContentTokenCount?: number;
  };
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

const GEMINI_TIMEOUT_MS = 8000;

function textFromGeminiResponse(data: GeminiApiResponse) {
  return (data.candidates || [])
    .flatMap((candidate) => candidate.content?.parts || [])
    .map((part) => part.text || "")
    .join("\n")
    .trim();
}

function geminiAuthHeaders(credential: string): Record<string, string> {
  return { "x-goog-api-key": credential.trim() };
}

function classifyGeminiHttpStatus(status: number) {
  if (status === 401 || status === 403) return "configuration_error" as const;
  if (status === 429) return "rate_limit" as const;
  return "api_error" as const;
}

function isCacheRelatedError(data: GeminiApiResponse) {
  const msg = (data.error?.message || "").toLowerCase();
  const status = data.error?.status || "";
  return status === "NOT_FOUND"
    || msg.includes("cached content")
    || msg.includes("not found")
    || msg.includes("expired");
}

async function callGemini(
  url: string,
  apiKey: string,
  input: ProviderRequest,
  cachedContentName: string | null,
  signal: AbortSignal
): Promise<{ response: Response; data: GeminiApiResponse } | null> {
  const requestBody: Record<string, unknown> = {
    contents: [{ parts: [{ text: input.userPrompt }] }],
    generationConfig: { temperature: input.temperature ?? 0.1, responseMimeType: "application/json" }
  };
  if (cachedContentName) {
    requestBody.cachedContent = cachedContentName;
  } else if (input.systemPrompt) {
    requestBody.systemInstruction = { parts: [{ text: input.systemPrompt }] };
  }

  let response: Response | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...geminiAuthHeaders(apiKey) },
      body: JSON.stringify(requestBody),
      signal
    });
    if (response.status < 500 || attempt === 1) break;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  if (!response) return null;
  const data = await response.json().catch(() => ({})) as GeminiApiResponse;
  return { response, data };
}

export async function generateStructuredWithGemini(input: ProviderRequest): Promise<GenerateStructuredResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = input.model;

  if (!apiKey) {
    return { ok: false, provider: "gemini", model, reason: "missing_api_key", message: "GEMINI_API_KEY nao configurada." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  const modelPath = model.replace(/^models\//, "");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelPath)}:generateContent`;

  let cachedContentName: string | null = null;
  if (input.systemPrompt) {
    cachedContentName = await getOrCreateCachedSystemPrompt(input.purpose, input.systemPrompt);
  }

  try {
    recordGeminiLiveCall();
    let result = await callGemini(url, apiKey, input, cachedContentName, controller.signal);

    if (!result) {
      return { ok: false, provider: "gemini", model, reason: "network_error", message: "Erro de rede ao chamar Gemini." };
    }

    if (!result.response.ok && cachedContentName && isCacheRelatedError(result.data)) {
      console.warn("[GEMINI CACHE] Cache reference failed, retrying without cache:", {
        purpose: input.purpose,
        cacheName: cachedContentName,
        error: result.data.error?.message
      });
      invalidateCache(input.purpose);
      cachedContentName = null;
      result = await callGemini(url, apiKey, input, null, controller.signal);
      if (!result) {
        return { ok: false, provider: "gemini", model, reason: "network_error", message: "Erro de rede ao chamar Gemini." };
      }
    }

    const { data } = result;
    if (!result.response.ok) {
      const rawText = JSON.stringify(data as AnyRecord).slice(0, 1200);
      return {
        ok: false,
        provider: "gemini",
        model,
        reason: classifyGeminiHttpStatus(result.response.status),
        status: result.response.status,
        message: data.error?.message || "Erro ao chamar Gemini.",
        rawText
      };
    }

    if (data.usageMetadata) {
      const cached = data.usageMetadata.cachedContentTokenCount || 0;
      if (cached > 0) {
        console.log("[GEMINI CACHE] Cache hit:", {
          purpose: input.purpose,
          cachedTokens: cached,
          totalInputTokens: data.usageMetadata.promptTokenCount,
          outputTokens: data.usageMetadata.candidatesTokenCount
        });
      }
    }

    const rawText = textFromGeminiResponse(data);
    if (!rawText) {
      return { ok: false, provider: "gemini", model, reason: "empty_response", message: "Gemini retornou resposta vazia." };
    }

    try {
      parseJsonObjectText(rawText);
    } catch {
      return { ok: false, provider: "gemini", model, reason: "invalid_json", message: "Gemini retornou JSON invalido.", rawText };
    }

    return {
      ok: true,
      provider: "gemini",
      model,
      rawText,
      usage: data.usageMetadata ? {
        inputTokens: data.usageMetadata.promptTokenCount,
        outputTokens: data.usageMetadata.candidatesTokenCount,
        totalTokens: data.usageMetadata.totalTokenCount
      } : undefined
    };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      provider: "gemini",
      model,
      reason: aborted ? "timeout" : "network_error",
      message: aborted ? "Tempo esgotado ao chamar Gemini." : "Erro de rede ao chamar Gemini."
    };
  } finally {
    clearTimeout(timeout);
  }
}
