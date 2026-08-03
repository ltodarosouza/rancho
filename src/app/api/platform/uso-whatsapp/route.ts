import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { TABLES } from "@/lib/tables";
import { currentMonth } from "@/lib/utils";
import { PROVISIONAL_WHATSAPP_USAGE_BANDS, usageSummary } from "@/lib/whatsapp/usage";

export const dynamic = "force-dynamic";

type SupabaseAdmin = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

const USAGE_FORBIDDEN_MESSAGE = "Voc\u00ea n\u00e3o tem permiss\u00e3o para acessar seu consumo do WhatsApp.";

function shouldIgnoreOptionalTableError(error: { message?: string } | null) {
  return Boolean(error?.message && /relation .* does not exist|column .* does not exist|schema cache/i.test(error.message));
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String((error as { message?: string })?.message || "");
}

function usageError(message: string, status = 403) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

async function requireUsageUser(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false as const, response: usageError("Supabase server-side n\u00e3o configurado.", 503) };

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false as const, response: usageError(USAGE_FORBIDDEN_MESSAGE) };

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user?.id) return { ok: false as const, response: usageError(USAGE_FORBIDDEN_MESSAGE) };

  const { data: profile, error: profileError } = await supabase
    .from(TABLES.usuarios)
    .select("id,fazenda_id,nome,papel,ativo")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);
  if (!profile?.ativo || !profile.fazenda_id || String(profile.papel || "") === "bot_only") {
    return { ok: false as const, response: usageError(USAGE_FORBIDDEN_MESSAGE) };
  }

  const { data: farm, error: farmError } = await supabase
    .from(TABLES.fazendas)
    .select("id,nome,plano,status,ativa")
    .eq("id", profile.fazenda_id)
    .maybeSingle();

  if (farmError) throw new Error(farmError.message);
  if (!farm || farm.ativa === false) return { ok: false as const, response: usageError("Este rancho n\u00e3o est\u00e1 ativo.") };

  return { ok: true as const, supabase, profile, farm };
}

async function loadUsage(supabase: SupabaseAdmin, farm: { id: string; nome?: string | null; plano?: string | null; status?: string | null; ativa?: boolean | null }) {
  const usageMonth = `${currentMonth()}-01`;
  const { data: usage, error: usageError } = await supabase
    .from(TABLES.whatsappUsoMensal)
    .select("fazenda_id,mes,mensagens_enviadas")
    .eq("fazenda_id", farm.id)
    .eq("mes", usageMonth)
    .maybeSingle();

  const usageAvailable = !usageError;
  if (usageError && !shouldIgnoreOptionalTableError(usageError)) throw new Error(usageError.message);

  const summaryWithReceived = usageSummary({
    month: usageMonth,
    sent: usage?.mensagens_enviadas
  });
  const summary = {
    month: summaryWithReceived.month,
    sent: summaryWithReceived.sent,
    total: summaryWithReceived.total,
    band: summaryWithReceived.band,
    nextBand: summaryWithReceived.nextBand,
    percentToNextBand: summaryWithReceived.percentToNextBand
  };
  const rancho = {
    id: String(farm.id),
    nome: String(farm.nome || "Rancho sem nome"),
    plano: String(farm.plano || "mvp"),
    status: String(farm.status || (farm.ativa === false ? "suspenso" : "ativo")),
    ativa: farm.ativa !== false,
    usage: { available: usageAvailable, ...summary }
  };

  return {
    usageAvailable,
    month: usageMonth,
    totals: {
      sent: summary.sent,
      total: summary.total,
      surcharge: summary.band.additionalFee
    },
    bands: PROVISIONAL_WHATSAPP_USAGE_BANDS.map((band) => ({ ...band })),
    rancho
  };
}

export async function GET(request: NextRequest) {
  try {
    const permission = await requireUsageUser(request);
    if (!permission.ok) return permission.response;

    return NextResponse.json({ ok: true, ...(await loadUsage(permission.supabase, permission.farm)) });
  } catch (error) {
    console.error("[whatsapp usage self-service]", error);
    return usageError(errorMessage(error) || "N\u00e3o foi poss\u00edvel carregar seu consumo do WhatsApp.", 500);
  }
}
