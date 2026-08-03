import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const MAX_MESSAGE_LENGTH = 300;
const GEMINI_TIMEOUT_MS = 12_000;

const DEMO_SYSTEM_PROMPT = `Você é o bot demonstrativo do Rancho, um sistema de gestão agropecuária com WhatsApp integrado.
Interprete a mensagem do usuário e responda como o bot real faria.

DADOS DA FAZENDA DEMONSTRATIVA:
Animais cadastrados:
- Mimosa (B-001) — Vaca, Lactação, produz ~28L/dia
- Branquinha (V-403) — Vaca, Pré-parto
- Imperador (T-007) — Touro, Reprodução
- Aurora (C-396) — Bezerra, Crescimento, 4 meses
- Estrela (B-012) — Vaca, Lactação, produz ~31L/dia
- Luna (N-401) — Novilha, Recria

Estoque:
- Ração bovina: 45 sacos (mínimo: 10)
- Sal mineral: 12 pacotes (mínimo: 5)
- Vacina clostridial: 8 doses
- Vermífugo ivermectina: 15 doses

Produção de hoje: Mimosa 28L, Estrela 31L — total 59L
Financeiro do mês: Entradas R$ 8.420 | Saídas R$ 4.140 | Saldo R$ 4.280
Última entrada: venda de leite R$ 1.280 (ontem)
Última saída: compra de ração R$ 960 (anteontem)

Funcionários: João (vaqueiro), Maria (auxiliar)

REGRAS DE RESPOSTA:
- Responda em português brasileiro, curto e direto (2-3 frases)
- Se for REGISTRO (produção, compra, venda, evento): interprete e peça confirmação com "1 - Confirmar  2 - Corrigir"
- Se for CONSULTA (quanto produziu, saldo, estoque): responda direto com os dados
- Use APENAS dados da lista acima, nunca invente animais ou valores
- Se a mensagem não for sobre gestão de fazenda, diga que ajuda apenas com a rotina da fazenda
- Não use markdown, emoji excessivo ou formatação especial — responda como WhatsApp`;

function buildUserPrompt(message: string): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  return `Data de hoje: ${dateStr}\nMensagem do usuário: "${message}"`;
}

async function callGemini(message: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return "";

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const modelPath = model.replace(/^models\//, "");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelPath)}:generateContent`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildUserPrompt(message) }] }],
        systemInstruction: { parts: [{ text: DEMO_SYSTEM_PROMPT }] },
        generationConfig: { temperature: 0.3 }
      }),
      signal: controller.signal
    });

    if (!response.ok) return "";

    const data = await response.json();
    const text = (data.candidates || [])
      .flatMap((c: { content?: { parts?: { text?: string }[] } }) => c.content?.parts || [])
      .map((p: { text?: string }) => p.text || "")
      .join("\n")
      .trim();

    return text || "";
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

const FALLBACK = "Desculpe, não consegui processar sua mensagem agora. Experimente uma das mensagens sugeridas para ver o bot em ação.";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const message = typeof body?.message === "string" ? body.message.trim() : "";

    if (!message || message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ ok: false, response: "Mensagem inválida." }, { status: 400 });
    }

    const geminiResponse = await callGemini(message);
    return NextResponse.json({
      ok: true,
      response: geminiResponse || FALLBACK,
      source: geminiResponse ? "ai" : "fallback"
    });
  } catch {
    return NextResponse.json({ ok: true, response: FALLBACK, source: "fallback" });
  }
}
