import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { maskSensitivePhone } from "@/lib/security";
import { TABLES } from "@/lib/tables";
import { normalizeWhatsappNumber, whatsappNumberCandidates, whatsappNumbersMatch } from "@/lib/phone";

type SupabaseAdmin = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

export type WhatsAppOwner = {
  fazenda_id: string;
  whatsapp_usuario_id: string | null;
  funcionario_id: string | null;
  usuario_id: string | null;
  telefone_e164: string;
  nome_exibicao?: string | null;
  papel_bot?: string | null;
  source: "whatsapp_usuarios" | "usuarios";
};

export type ResolveWhatsAppOwnerResult = {
  owner: WhatsAppOwner | null;
  reason?: "not_registered" | "no_farm" | "farm_inactive" | "user_inactive" | "multiple_farms";
};

function matchesIncomingPhone(value: unknown, incomingCandidates: Set<string>) {
  return whatsappNumberCandidates(String(value || "")).some((candidate) => incomingCandidates.has(candidate));
}

async function assertActiveFarm(supabase: SupabaseAdmin, fazendaId?: string | null) {
  if (!fazendaId) return "no_farm" as const;

  const { data, error } = await supabase
    .from(TABLES.fazendas)
    .select("id,ativa")
    .eq("id", fazendaId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return "no_farm" as const;
  if (data.ativa === false) return "farm_inactive" as const;
  return null;
}

async function findWhatsAppUsers(supabase: SupabaseAdmin, incomingCandidates: Set<string>) {
  const { data, error } = await supabase
    .from(TABLES.whatsappUsuarios)
    .select("id,fazenda_id,usuario_id,funcionario_id,telefone_e164,nome_exibicao,papel_bot,ativo")
    .limit(2000);

  if (error) throw new Error(error.message);
  return (data || []).filter((row) => matchesIncomingPhone(row.telefone_e164, incomingCandidates));
}

async function findOwnerUsers(supabase: SupabaseAdmin, incomingCandidates: Set<string>) {
  const { data, error } = await supabase
    .from(TABLES.usuarios)
    .select("id,fazenda_id,nome,telefone,papel,ativo")
    .limit(2000);

  if (error) throw new Error(error.message);
  return (data || []).filter((row) => {
    const role = String(row.papel || "");
    return ["dono", "admin"].includes(role) && matchesIncomingPhone(row.telefone, incomingCandidates);
  });
}

async function restoreOwnerWhatsAppAccess(
  supabase: SupabaseAdmin,
  user: Record<string, unknown>,
  normalizedPhone: string
) {
  const telefone = normalizedPhone || normalizeWhatsappNumber(String(user.telefone || ""));
  if (!telefone) throw new Error("Administrador sem telefone valido para acesso ao WhatsApp");

  const payload = {
    fazenda_id: String(user.fazenda_id),
    usuario_id: String(user.id),
    funcionario_id: null,
    telefone_e164: telefone,
    nome_exibicao: String(user.nome || "Administrador"),
    papel_bot: "admin",
    ativo: true
  };

  const { data: existingRows, error: existingError } = await supabase
    .from(TABLES.whatsappUsuarios)
    .select("id,fazenda_id,usuario_id,funcionario_id,telefone_e164,nome_exibicao,papel_bot,ativo")
    .eq("fazenda_id", payload.fazenda_id)
    .eq("usuario_id", payload.usuario_id)
    .limit(5);

  if (existingError) throw new Error(existingError.message);

  const existing = (existingRows || [])[0];
  if (existing?.id) {
    const { data, error } = await supabase
      .from(TABLES.whatsappUsuarios)
      .update(payload)
      .eq("id", existing.id)
      .select("id,fazenda_id,usuario_id,funcionario_id,telefone_e164,nome_exibicao,papel_bot,ativo")
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  const { data, error } = await supabase
    .from(TABLES.whatsappUsuarios)
    .insert(payload)
    .select("id,fazenda_id,usuario_id,funcionario_id,telefone_e164,nome_exibicao,papel_bot,ativo")
    .single();

  if (!error && data) return data;

  // A second concurrent message may have created the same link first.
  const concurrentRows = await findWhatsAppUsers(supabase, new Set(whatsappNumberCandidates(telefone)));
  const concurrent = concurrentRows.find((row) => (
    String(row.fazenda_id) === payload.fazenda_id && String(row.usuario_id) === payload.usuario_id
  ));
  if (concurrent) return concurrent;

  throw new Error(error?.message || "Nao foi possivel restaurar o acesso ao WhatsApp");
}

export async function resolveWhatsAppOwner(supabase: SupabaseAdmin, from: string): Promise<ResolveWhatsAppOwnerResult> {
  const normalizedPhone = normalizeWhatsappNumber(from);
  const incomingCandidates = new Set(whatsappNumberCandidates(from));

  const whatsappUsers = await findWhatsAppUsers(supabase, incomingCandidates);
  if (whatsappUsers.length > 0) {
    let blockedReason: ResolveWhatsAppOwnerResult["reason"] = "user_inactive";
    const activeUsers = whatsappUsers.filter((row) => row.ativo !== false && row.fazenda_id);
    const activeFarmIds = new Set(activeUsers.map((row) => String(row.fazenda_id)));

    if (activeFarmIds.size > 1) {
      console.log("[BOT AUTH]", {
        fromRaw: maskSensitivePhone(from),
        normalized: maskSensitivePhone(normalizedPhone),
        source: "whatsapp_usuarios",
        userFound: true,
        ranchoFound: true,
        reason: "multiple_farms"
      });

      return { owner: null, reason: "multiple_farms" };
    }

    for (const whatsappUser of whatsappUsers) {
      if (whatsappUser.ativo === false) continue;

      const farmError = await assertActiveFarm(supabase, whatsappUser.fazenda_id as string | null);
      if (farmError) {
        blockedReason = farmError;
        continue;
      }

      const owner = {
        fazenda_id: whatsappUser.fazenda_id as string,
        whatsapp_usuario_id: whatsappUser.id as string,
        funcionario_id: (whatsappUser.funcionario_id as string | null) || null,
        usuario_id: (whatsappUser.usuario_id as string | null) || null,
        telefone_e164: normalizeWhatsappNumber(whatsappUser.telefone_e164 as string) || normalizedPhone,
        nome_exibicao: whatsappUser.nome_exibicao as string | null,
        papel_bot: whatsappUser.papel_bot as string | null,
        source: "whatsapp_usuarios" as const
      };

      console.log("[BOT AUTH]", {
        fromRaw: maskSensitivePhone(from),
        normalized: maskSensitivePhone(normalizedPhone),
        source: "whatsapp_usuarios",
        userFound: true,
        ranchoFound: Boolean(owner.fazenda_id),
        reason: "ok"
      });

      return { owner };
    }

    console.log("[BOT AUTH]", {
      fromRaw: maskSensitivePhone(from),
      normalized: maskSensitivePhone(normalizedPhone),
      source: "whatsapp_usuarios",
      userFound: true,
      ranchoFound: whatsappUsers.some((row) => Boolean(row.fazenda_id)),
      reason: blockedReason
    });

    return { owner: null, reason: blockedReason };
  }

  const ownerUsers = await findOwnerUsers(supabase, incomingCandidates);
  if (ownerUsers.length > 0) {
    let blockedReason: ResolveWhatsAppOwnerResult["reason"] = "user_inactive";
    const activeUsers = ownerUsers.filter((row) => row.ativo !== false && row.fazenda_id);
    const activeFarmIds = new Set(activeUsers.map((row) => String(row.fazenda_id)));

    if (activeFarmIds.size > 1) {
      console.log("[BOT AUTH]", {
        fromRaw: maskSensitivePhone(from),
        normalized: maskSensitivePhone(normalizedPhone),
        source: "usuarios",
        userFound: true,
        ranchoFound: true,
        reason: "multiple_farms"
      });

      return { owner: null, reason: "multiple_farms" };
    }

    for (const user of ownerUsers) {
      if (user.ativo === false) continue;

      const farmError = await assertActiveFarm(supabase, user.fazenda_id as string | null);
      if (farmError) {
        blockedReason = farmError;
        continue;
      }

      const whatsappUser = await restoreOwnerWhatsAppAccess(supabase, user, normalizedPhone);
      const owner = {
        fazenda_id: whatsappUser.fazenda_id as string,
        whatsapp_usuario_id: whatsappUser.id as string,
        funcionario_id: (whatsappUser.funcionario_id as string | null) || null,
        usuario_id: (whatsappUser.usuario_id as string | null) || (user.id as string),
        telefone_e164: normalizeWhatsappNumber(whatsappUser.telefone_e164 as string) || normalizedPhone,
        nome_exibicao: (whatsappUser.nome_exibicao as string | null) || (user.nome as string | null),
        papel_bot: (whatsappUser.papel_bot as string | null) || "admin",
        source: "usuarios" as const
      };

      console.log("[BOT AUTH]", {
        fromRaw: maskSensitivePhone(from),
        normalized: maskSensitivePhone(normalizedPhone),
        source: "usuarios",
        userFound: true,
        ranchoFound: Boolean(owner.fazenda_id),
        reason: "ok",
        whatsappAccessRestored: true
      });

      return { owner };
    }

    console.log("[BOT AUTH]", {
      fromRaw: maskSensitivePhone(from),
      normalized: maskSensitivePhone(normalizedPhone),
      source: "usuarios",
      userFound: true,
      ranchoFound: ownerUsers.some((row) => Boolean(row.fazenda_id)),
      reason: blockedReason
    });

    return { owner: null, reason: blockedReason };
  }

  console.log("[BOT AUTH]", {
    fromRaw: maskSensitivePhone(from),
    normalized: maskSensitivePhone(normalizedPhone),
    source: "none",
    userFound: false,
    ranchoFound: false,
    reason: "not_registered"
  });

  return { owner: null, reason: "not_registered" };
}

export function phoneMatchesRegisteredWhatsapp(incoming: string, registered: string) {
  return whatsappNumbersMatch(incoming, registered);
}
