import { env, isMetaConfigured as isMetaEnvConfigured } from "@/lib/env";
import { createHmac, timingSafeEqual } from "node:crypto";

export type WhatsAppButton = {
  id: string;
  title: string;
};

type MetaWebhookPayload = Record<string, any>;

export type MetaIncomingMessage = {
  phone: string;
  id: string;
  type: string;
  text: string;
  buttonId?: string;
  to?: string;
  raw: MetaWebhookPayload;
};

const apiBase = "https://graph.facebook.com/v20.0";

type MetaApiErrorPayload = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
};

export class MetaWhatsAppApiError extends Error {
  status: number;
  code: number | null;
  subcode: number | null;
  metaType: string | null;
  traceId: string | null;

  constructor(status: number, payload?: MetaApiErrorPayload) {
    super(payload?.message || "Erro ao enviar mensagem pela WhatsApp Cloud API");
    this.name = "MetaWhatsAppApiError";
    this.status = status;
    this.code = Number.isFinite(payload?.code) ? Number(payload?.code) : null;
    this.subcode = Number.isFinite(payload?.error_subcode) ? Number(payload?.error_subcode) : null;
    this.metaType = payload?.type || null;
    this.traceId = payload?.fbtrace_id || null;
  }
}

export function isMetaConfigured() {
  return isMetaEnvConfigured();
}

export function isMetaWebhookVerificationConfigured() {
  return Boolean(env.metaVerifyToken);
}

export function isMetaWebhookSignatureConfigured() {
  return Boolean(env.metaAppSecret);
}

export function verifyMetaWebhookSignature(rawBody: string, signature: string | null) {
  if (!env.metaAppSecret) return false;
  if (!signature?.startsWith("sha256=")) return false;

  const expected = `sha256=${createHmac("sha256", env.metaAppSecret).update(rawBody, "utf8").digest("hex")}`;
  const actualBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

async function sendPayload(payload: any) {
  if (!isMetaConfigured()) {
    return { demo: true, type: payload?.type || "unknown" };
  }

  const response = await fetch(`${apiBase}/${env.metaPhoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.metaWhatsappToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new MetaWhatsAppApiError(response.status, data?.error);
  }
  return data;
}

export async function sendWhatsAppText(to: string, body: string) {
  return sendPayload({
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { preview_url: false, body }
  });
}

export async function sendWhatsAppButtons(to: string, body: string, buttons: WhatsAppButton[]) {
  return sendPayload({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: body },
      action: {
        buttons: buttons.slice(0, 3).map((button) => ({
          type: "reply",
          reply: { id: button.id, title: button.title.slice(0, 20) }
        }))
      }
    }
  });
}

export function getIncomingMessages(payload: MetaWebhookPayload): MetaIncomingMessage[] {
  const incoming: MetaIncomingMessage[] = [];

  for (const entry of payload?.entry || []) {
    for (const change of entry?.changes || []) {
      const value = change?.value;
      const displayPhoneNumber = value?.metadata?.display_phone_number;

      for (const message of value?.messages || []) {
        const phone = String(message?.from || "");
        const id = String(message?.id || "");
        if (!phone || !id) continue;

        const buttonId = message?.interactive?.button_reply?.id
          || message?.interactive?.list_reply?.id
          || message?.button?.payload;
        const buttonTitle = message?.interactive?.button_reply?.title
          || message?.interactive?.list_reply?.title
          || message?.button?.text;
        const text = message?.text?.body || buttonId || buttonTitle || "";

        incoming.push({
          phone,
          id,
          type: String(message?.type || "unknown"),
          text: String(text),
          buttonId: buttonId ? String(buttonId) : undefined,
          to: displayPhoneNumber ? String(displayPhoneNumber) : undefined,
          raw: message
        });
      }
    }
  }

  return incoming;
}

export function getIncomingMessage(payload: MetaWebhookPayload) {
  return getIncomingMessages(payload)[0] || null;
}
