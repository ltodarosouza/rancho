import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { TABLES } from "@/lib/tables";
import { processWhatsappMessage } from "@/services/whatsapp/process-message";
import { sendOutboundWhatsAppText } from "@/services/whatsapp/outbound";
import type { MetaIncomingMessage } from "@/services/whatsapp/meta";

export async function wasMetaMessageProcessed(messageId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase || !messageId) return false;

  const { data, error } = await supabase
    .from(TABLES.whatsappMensagens)
    .select("wa_message_id")
    .eq("wa_message_id", messageId)
    .eq("direcao", "entrada")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[WhatsApp Cloud API] Não foi possível verificar duplicidade", { code: error.code || null });
    return false;
  }

  return Boolean(data);
}

export async function handleMetaRanchoMessage(input: MetaIncomingMessage) {
  const result = await processWhatsappMessage({
    telefone: input.phone,
    mensagem: input.text,
    provider: "meta",
    modoTeste: false,
    messageSid: input.id,
    to: input.to,
    raw: {
      provider: "meta",
      messageType: input.type,
      message: input.raw
    }
  });

  await sendOutboundWhatsAppText(input.phone, result.respostaTexto, { provider: "meta" });
  return result;
}
