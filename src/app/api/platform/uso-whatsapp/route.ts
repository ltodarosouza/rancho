import { NextRequest, NextResponse } from "next/server";
import { platformAdminError, requirePlatformAdmin } from "@/lib/server/platform-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { TABLES } from "@/lib/tables";
import type { AnyRecord } from "@/lib/types";
import { currentMonth } from "@/lib/utils";
import { PROVISIONAL_WHATSAPP_USAGE_BANDS, usageSummary } from "@/lib/whatsapp/usage";

export const dynamic = "force-dynamic";

type SupabaseAdmin = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

function shouldIgnoreOptionalTableError(error: { message?: string } | null) {
  return Boolean(error?.message && /relation .* does not exist|column .* does not exist|schema cache/i.test(error.message));
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String((error as { message?: string })?.message || "");
}

async function loadUsage(supabase: SupabaseAdmin) {
  const usageMonth = `${currentMonth()}-01`;
  const [{ data: farms, error: farmsError }, { data: usageRows, error: usageError }] = await Promise.all([
    supabase.from(TABLES.fazendas).select("id,nome,plano,status,ativa").order("nome", { ascending: true }),
    supabase.from(TABLES.whatsappUsoMensal).select("fazenda_id,mes,mensagens_recebidas,mensagens_enviadas").eq("mes", usageMonth)
  ]);

  if (farmsError) throw new Error(farmsError.message);
  const usageAvailable = !usageError;
  if (usageError && !shouldIgnoreOptionalTableError(usageError)) throw new Error(usageError.message);

  const usageByFarmId = new Map(
    ((usageRows || []) as AnyRecord[]).map((usage) => [String(usage.fazenda_id), usage])
  );
  const ranchos = ((farms || []) as AnyRecord[]).map((farm) => {
    const usage = usageByFarmId.get(String(farm.id));
    const summary = usageSummary({
      month: usageMonth,
      received: usage?.mensagens_recebidas,
      sent: usage?.mensagens_enviadas
    });

    return {
      id: String(farm.id),
      nome: String(farm.nome || "Rancho sem nome"),
      plano: String(farm.plano || "mvp"),
      status: String(farm.status || (farm.ativa === false ? "suspenso" : "ativo")),
      ativa: farm.ativa !== false,
      usage: { available: usageAvailable, ...summary }
    };
  });

  const totals = ranchos.reduce((result, rancho) => ({
    received: result.received + rancho.usage.received,
    sent: result.sent + rancho.usage.sent,
    total: result.total + rancho.usage.total,
    surcharge: result.surcharge + rancho.usage.band.additionalFee
  }), { received: 0, sent: 0, total: 0, surcharge: 0 });

  const bands = PROVISIONAL_WHATSAPP_USAGE_BANDS.map((band) => {
    const inBand = ranchos.filter((rancho) => rancho.usage.band.key === band.key);
    return {
      ...band,
      ranchos: inBand.length,
      messages: inBand.reduce((total, rancho) => total + rancho.usage.total, 0)
    };
  });

  return { usageAvailable, month: usageMonth, totals, bands, ranchos };
}

export async function GET(request: NextRequest) {
  try {
    const permission = await requirePlatformAdmin(request);
    if (!permission.ok) return permission.response;

    return NextResponse.json({ ok: true, ...(await loadUsage(permission.supabase)) });
  } catch (error) {
    console.error("[platform usage]", error);
    return platformAdminError(errorMessage(error) || "Não foi possível carregar o gerenciamento de uso.", 500);
  }
}
