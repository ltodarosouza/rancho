import { configuredGeminiModel } from "@/lib/whatsapp/gemini/config";

type CachedContentEntry = {
  name: string;
  promptHash: string;
  model: string;
  expiresAt: number;
};

const cache = new Map<string, CachedContentEntry>();

const CACHE_TTL_SECONDS = 3600;
const REFRESH_MARGIN_MS = 5 * 60 * 1000;
const PROACTIVE_REFRESH_MS = 20 * 60 * 1000;
const MIN_TOKENS_FOR_CACHE = 4096;

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

function simpleHash(text: string) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash.toString(36);
}

function geminiAuthHeaders(apiKey: string): Record<string, string> {
  return { "x-goog-api-key": apiKey.trim() };
}

async function createCachedContent(
  apiKey: string,
  model: string,
  systemPrompt: string
): Promise<{ name: string; expireTime: string } | null> {
  const modelPath = model.startsWith("models/") ? model : `models/${model}`;
  const url = "https://generativelanguage.googleapis.com/v1beta/cachedContents";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...geminiAuthHeaders(apiKey)
      },
      body: JSON.stringify({
        model: modelPath,
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        ttl: `${CACHE_TTL_SECONDS}s`
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn("[GEMINI CACHE] Failed to create cached content:", {
        status: response.status,
        error: (errorData as Record<string, unknown>)?.error || null
      });
      return null;
    }

    const data = await response.json() as { name?: string; expireTime?: string };
    if (!data.name) {
      console.warn("[GEMINI CACHE] Created content missing name");
      return null;
    }

    console.log("[GEMINI CACHE] Created cached content:", {
      name: data.name,
      expireTime: data.expireTime,
      ttl: `${CACHE_TTL_SECONDS}s`
    });

    return { name: data.name, expireTime: data.expireTime || "" };
  } catch (error) {
    console.warn("[GEMINI CACHE] Error creating cached content:", {
      message: error instanceof Error ? error.message : "unknown"
    });
    return null;
  }
}

async function refreshCachedContent(
  apiKey: string,
  cacheName: string
): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/${cacheName}`;

  try {
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...geminiAuthHeaders(apiKey)
      },
      body: JSON.stringify({
        ttl: `${CACHE_TTL_SECONDS}s`
      }),
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      console.warn("[GEMINI CACHE] Failed to refresh:", { status: response.status, cacheName });
      return null;
    }

    const data = await response.json() as { expireTime?: string };
    console.log("[GEMINI CACHE] Refreshed cache:", {
      name: cacheName,
      newExpireTime: data.expireTime
    });
    return data.expireTime || null;
  } catch (error) {
    console.warn("[GEMINI CACHE] Error refreshing:", {
      message: error instanceof Error ? error.message : "unknown"
    });
    return null;
  }
}

async function deleteCachedContent(apiKey: string, cacheName: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/${cacheName}`;
  try {
    await fetch(url, {
      method: "DELETE",
      headers: geminiAuthHeaders(apiKey),
      signal: AbortSignal.timeout(5000)
    });
  } catch {
    // best-effort cleanup
  }
}

export async function getOrCreateCachedSystemPrompt(
  purpose: string,
  systemPrompt: string
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  if (estimateTokens(systemPrompt) < MIN_TOKENS_FOR_CACHE) return null;

  const model = configuredGeminiModel();
  const promptHash = simpleHash(systemPrompt);
  const cacheKey = `${purpose}:${model}`;
  const existing = cache.get(cacheKey);
  const now = Date.now();

  if (existing && existing.promptHash === promptHash && existing.model === model) {
    const timeLeft = existing.expiresAt - now;
    if (timeLeft > REFRESH_MARGIN_MS) {
      if (timeLeft < PROACTIVE_REFRESH_MS) {
        refreshCachedContent(apiKey, existing.name).then((newExpireTime) => {
          if (newExpireTime) {
            existing.expiresAt = Date.parse(newExpireTime) || (now + CACHE_TTL_SECONDS * 1000);
          }
        }).catch(() => {});
      }
      return existing.name;
    }

    const newExpireTime = await refreshCachedContent(apiKey, existing.name);
    if (newExpireTime) {
      existing.expiresAt = Date.parse(newExpireTime) || (now + CACHE_TTL_SECONDS * 1000);
      console.log("[GEMINI CACHE] Extended cache TTL:", {
        purpose,
        name: existing.name,
        expiresIn: `${Math.round((existing.expiresAt - now) / 1000)}s`
      });
      return existing.name;
    }

    cache.delete(cacheKey);
  }

  if (existing && (existing.promptHash !== promptHash || existing.model !== model)) {
    await deleteCachedContent(apiKey, existing.name);
    cache.delete(cacheKey);
  }

  const result = await createCachedContent(apiKey, model, systemPrompt);
  if (!result) return null;

  const expiresAt = result.expireTime
    ? Date.parse(result.expireTime)
    : now + CACHE_TTL_SECONDS * 1000;

  cache.set(cacheKey, {
    name: result.name,
    promptHash,
    model,
    expiresAt: Number.isFinite(expiresAt) ? expiresAt : now + CACHE_TTL_SECONDS * 1000
  });

  return result.name;
}

export function invalidateCache(purpose: string) {
  const model = configuredGeminiModel();
  const cacheKey = `${purpose}:${model}`;
  cache.delete(cacheKey);
}

export function getCacheStats() {
  const now = Date.now();
  const entries: Record<string, { name: string; expiresInSeconds: number; model: string }> = {};
  cache.forEach((entry, key) => {
    entries[key] = {
      name: entry.name,
      expiresInSeconds: Math.round((entry.expiresAt - now) / 1000),
      model: entry.model
    };
  });
  return entries;
}
