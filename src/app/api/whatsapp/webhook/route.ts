import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { isOversizedText, maskSensitivePhone, MAX_WHATSAPP_STRUCTURED_MESSAGE_LENGTH, safeErrorText, sanitizeFreeText, sanitizeWhatsappMessageText } from "@/lib/security";
import {
  getIncomingMessages,
  isMetaWebhookSignatureConfigured,
  isMetaWebhookVerificationConfigured,
  verifyMetaWebhookSignature
} from "@/services/whatsapp/meta";
import { handleMetaRanchoMessage, wasMetaMessageProcessed } from "@/services/whatsapp/cloud-api";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const mode = search.get("hub.mode");
  const token = search.get("hub.verify_token");
  const challenge = search.get("hub.challenge");

  if (!isMetaWebhookVerificationConfigured()) {
    console.error("[WhatsApp Cloud API] META_VERIFY_TOKEN não configurado.");
    return NextResponse.json({ error: "Webhook da Meta não configurado" }, { status: 503 });
  }

  if (mode === "subscribe" && token === env.metaVerifyToken) {
    return new Response(challenge || "", { status: 200 });
  }

  return NextResponse.json({ error: "Token de verificação inválido" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType && !contentType.toLowerCase().includes("application/json")) {
      return NextResponse.json({ ok: false, error: "Formato de requisição inválido." }, { status: 415 });
    }

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (Number.isFinite(contentLength) && contentLength > 100_000) {
      return NextResponse.json({ ok: false, error: "Mensagem muito longa para processar com segurança." }, { status: 413 });
    }

    if (!isMetaWebhookSignatureConfigured()) {
      console.error("[WhatsApp Cloud API] META_APP_SECRET não configurado.");
      return NextResponse.json({ ok: false, error: "Webhook da Meta não configurado." }, { status: 503 });
    }

    const rawBody = await request.text();
    if (isOversizedText(rawBody, 100_000)) {
      return NextResponse.json({ ok: false, error: "Payload muito longo para processar com segurança." }, { status: 413 });
    }

    if (!verifyMetaWebhookSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
      console.warn("[WhatsApp Cloud API] Assinatura inválida.");
      return NextResponse.json({ ok: false, error: "Assinatura inválida." }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    if (payload?.object !== "whatsapp_business_account") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const incomingMessages = getIncomingMessages(payload);

    if (!incomingMessages.length) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const results = [];
    for (const incoming of incomingMessages) {
      const phone = sanitizeFreeText(incoming.phone, 80);
      const text = sanitizeWhatsappMessageText(incoming.text, MAX_WHATSAPP_STRUCTURED_MESSAGE_LENGTH);
      if (!phone || !text) {
        results.push({ id: incoming.id, ignored: "unsupported_message_type" });
        continue;
      }

      if (await wasMetaMessageProcessed(incoming.id)) {
        console.log("[WhatsApp Cloud API] Mensagem duplicada ignorada", { id: incoming.id, phone: maskSensitivePhone(phone) });
        results.push({ id: incoming.id, ignored: "duplicate" });
        continue;
      }

      const result = await handleMetaRanchoMessage({ ...incoming, phone, text });
      results.push({ id: incoming.id, sent: result.outboundSent });
    }

    return NextResponse.json({ ok: true, processed: results.length, results });
  } catch (error) {
    console.error("[WhatsApp webhook]", safeErrorText(error));
    return NextResponse.json({ ok: false, error: "Não foi possível processar a mensagem agora." }, { status: 500 });
  }
}
