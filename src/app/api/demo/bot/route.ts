import { NextRequest, NextResponse } from "next/server";
import { MAX_WHATSAPP_STRUCTURED_MESSAGE_LENGTH, isOversizedText, sanitizeWhatsappMessageText } from "@/lib/security";
import { cloneDemoStore, type DemoStore } from "@/lib/marketing/demo-store";
import { createDemoSupabase } from "@/services/whatsapp/demo-supabase";
import { processWhatsappMessage } from "@/services/whatsapp/process-message";
import type { BotSession } from "@/services/whatsapp/session-service";
import type { ParsedRanchoMessage } from "@/lib/whatsapp/nlp";
import type { WhatsAppOwner } from "@/services/whatsapp/identity";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const DEMO_PHONE = "+5500000000000";
const MAX_ROWS_PER_COLLECTION = 120;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeStore(value: unknown): DemoStore {
  const base = cloneDemoStore();
  if (!isRecord(value)) return base;
  const collection = <T>(key: keyof DemoStore) => {
    const candidate = value[key];
    return Array.isArray(candidate) ? candidate.slice(0, MAX_ROWS_PER_COLLECTION) as T[] : base[key];
  };
  return {
    animals: collection("animals"),
    transactions: collection("transactions"),
    stock: collection("stock"),
    production: collection("production"),
    lots: collection("lots"),
    events: collection("events")
  } as DemoStore;
}

function pendingFromRequest(value: unknown) {
  if (!isRecord(value)) return { parsed: null as ParsedRanchoMessage | null, etapa: "livre" as BotSession["etapa"] };
  const parsed = isRecord(value.parsed) ? value.parsed as unknown as ParsedRanchoMessage : null;
  const etapa = value.etapa === "aguardando_dado" || value.etapa === "aguardando_confirmacao"
    ? value.etapa
    : parsed ? "aguardando_confirmacao" : "livre";
  return { parsed, etapa: etapa as BotSession["etapa"] };
}

function demoOwner(): WhatsAppOwner {
  return {
    fazenda_id: "demo",
    whatsapp_usuario_id: "demo-whatsapp",
    funcionario_id: null,
    usuario_id: "demo-user",
    telefone_e164: DEMO_PHONE,
    nome_exibicao: "Demonstração Rancho",
    papel_bot: "admin",
    source: "whatsapp_usuarios"
  };
}

function pendingResponse(result: Awaited<ReturnType<typeof processWhatsappMessage>>) {
  const parsed = result.pendingAction || (result.camposFaltantes.length
    ? {
      tipo: result.intencaoDetectada || "DESCONHECIDO",
      confianca: result.confianca || 0.9,
      perguntas_faltantes: result.camposFaltantes,
      campos_faltantes: result.camposFaltantes,
      dados: result.dadosExtraidos || {}
    } as unknown as ParsedRanchoMessage
    : null);
  if (!parsed || (result.estadoNovo === "livre" && !result.camposFaltantes.length)) return null;
  return {
    parsed,
    etapa: result.estadoNovo === "aguardando_dado" || result.camposFaltantes.length ? "aguardando_dado" : "aguardando_confirmacao",
    summary: result.respostaTexto
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const rawMessage = typeof body?.message === "string" ? body.message : "";
    const message = sanitizeWhatsappMessageText(rawMessage, MAX_WHATSAPP_STRUCTURED_MESSAGE_LENGTH);
    if (!message) return NextResponse.json({ ok: false, response: "Mensagem inválida." }, { status: 400 });
    if (isOversizedText(rawMessage, MAX_WHATSAPP_STRUCTURED_MESSAGE_LENGTH)) {
      return NextResponse.json({ ok: false, response: "Mensagem muito longa para a demonstração." }, { status: 413 });
    }

    const store = normalizeStore(body?.store);
    const incomingPending = pendingFromRequest(body?.pendingAction);
    const initialSession: BotSession = {
      etapa: incomingPending.parsed ? incomingPending.etapa : "livre",
      dados: incomingPending.parsed ? { pending: incomingPending.parsed } : {}
    };
    const demoDatabase = createDemoSupabase(store, DEMO_PHONE, initialSession);
    const supabase = getSupabaseAdmin();

    const result = await processWhatsappMessage({
      telefone: DEMO_PHONE,
      mensagem: message,
      provider: "simulador",
      modoTeste: true,
      salvarReal: true,
      demo: {
        // The production service only needs the Supabase shape. This client is
        // an isolated adapter backed by the store supplied by the landing page.
        supabase: (demoDatabase.client as unknown as NonNullable<typeof supabase>),
        owner: demoOwner(),
        session: initialSession
      }
    });

    return NextResponse.json({
      ok: !result.erro,
      response: result.respostaTexto,
      store,
      pendingAction: pendingResponse(result),
      source: "whatsapp_process",
      intencaoDetectada: result.intencaoDetectada,
      confianca: result.confianca,
      dadosExtraidos: result.dadosExtraidos,
      estadoAnterior: result.estadoAnterior,
      estadoNovo: result.estadoNovo,
      camposFaltantes: result.camposFaltantes,
      eventoConfirmado: result.eventoConfirmado,
      erro: result.erro
    });
  } catch {
    return NextResponse.json({ ok: false, response: "Não consegui processar a demonstração agora. Tente novamente." }, { status: 200 });
  }
}
