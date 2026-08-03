import { currentMonth, formatCurrency } from "@/lib/utils";

export type WhatsAppUsageDirection = "entrada" | "saida";

export type WhatsAppUsageBand = {
  key: string;
  label: string;
  min: number;
  max: number | null;
  additionalFee: number;
};

export type WhatsAppUsageSummary = {
  month: string;
  received: number;
  sent: number;
  total: number;
  band: WhatsAppUsageBand;
  nextBand: WhatsAppUsageBand | null;
  percentToNextBand: number | null;
};

/**
 * Faixas provisórias para visualizar o modelo de cobrança antes da definição
 * comercial final. Os valores ficam centralizados para serem trocados em um
 * único lugar quando a tabela oficial for decidida.
 */
export const PROVISIONAL_WHATSAPP_USAGE_BANDS: WhatsAppUsageBand[] = [
  { key: "faixa_1", label: "Faixa 1", min: 0, max: 500, additionalFee: 100 },
  { key: "faixa_2", label: "Faixa 2", min: 501, max: 2_000, additionalFee: 200 },
  { key: "faixa_3", label: "Faixa 3", min: 2_001, max: 5_000, additionalFee: 350 },
  { key: "faixa_4", label: "Faixa 4", min: 5_001, max: null, additionalFee: 500 }
];

export function usageBandForTotal(total: number) {
  const normalizedTotal = Math.max(0, Math.floor(Number(total) || 0));
  return PROVISIONAL_WHATSAPP_USAGE_BANDS.find((band) => (
    normalizedTotal >= band.min && (band.max === null || normalizedTotal <= band.max)
  )) || PROVISIONAL_WHATSAPP_USAGE_BANDS[PROVISIONAL_WHATSAPP_USAGE_BANDS.length - 1];
}

export function usageSummary(input: {
  month?: string;
  received?: number;
  sent?: number;
}): WhatsAppUsageSummary {
  const received = Math.max(0, Math.floor(Number(input.received) || 0));
  const sent = Math.max(0, Math.floor(Number(input.sent) || 0));
  const total = received + sent;
  const band = usageBandForTotal(total);
  const bandIndex = PROVISIONAL_WHATSAPP_USAGE_BANDS.findIndex((candidate) => candidate.key === band.key);
  const nextBand = PROVISIONAL_WHATSAPP_USAGE_BANDS[bandIndex + 1] || null;
  const percentToNextBand = nextBand
    ? Math.min(100, Math.round((total / nextBand.min) * 100))
    : null;

  return {
    month: input.month || `${currentMonth()}-01`,
    received,
    sent,
    total,
    band,
    nextBand,
    percentToNextBand
  };
}

export function formatUsageFee(value: number) {
  return formatCurrency(value);
}

type UsageRpcClient = {
  rpc: (functionName: string, args: Record<string, unknown>) => PromiseLike<{ error: { message?: string } | null }>;
};

export async function incrementWhatsAppUsage(
  supabase: UsageRpcClient,
  fazendaId: string,
  direction: WhatsAppUsageDirection
) {
  return supabase.rpc("increment_whatsapp_usage", {
    p_fazenda_id: fazendaId,
    p_mes: `${currentMonth()}-01`,
    p_direcao: direction
  });
}
