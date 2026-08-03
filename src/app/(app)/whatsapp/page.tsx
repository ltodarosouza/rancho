"use client";

import { Bot, CheckCircle2, MessageCircle, Pencil, ShieldCheck, Smartphone, Trash2, UserPlus, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, ErrorState } from "@/components/ui/AsyncState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth-context";
import { formatBrazilianPhone, isValidBrazilianPhone } from "@/lib/input-format";
import { TABLES } from "@/lib/tables";
import { formatDate } from "@/lib/utils";
import { normalizeWhatsappNumber, whatsappNumbersMatch } from "@/lib/phone";
import { canManageData } from "@/lib/permissions";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { withAsyncTimeout } from "@/lib/async";
import { BOT_ROLE_OPTIONS, botRoleLabel, normalizeBotRole } from "@/lib/whatsapp/bot-access";
import { createRecord, deleteRecord, deleteRecords, listRecords, updateRecord } from "@/services/crud";
import type { AnyRecord } from "@/lib/types";

const initialDraft = {
  nome: "",
  whatsapp: "",
  papel_bot: "funcionario",
  ativo: true
};

const WHATSAPP_USERS_SELECT = [
  "id",
  "fazenda_id",
  "telefone_e164",
  "nome_exibicao",
  "papel_bot",
  "ativo",
  "usuario_id",
  "funcionario_id",
  "created_at"
].join(",");

function roleLabel(value: unknown) {
  return botRoleLabel(value);
}

function roleFromDatabase(value: unknown) {
  return normalizeBotRole(value);
}

function roleToDatabase(value: string) {
  return normalizeBotRole(value);
}

export default function WhatsAppPage() {
  const { dataContext, profile } = useAuth();
  const [rows, setRows] = useState<AnyRecord[]>([]);
  const [draft, setDraft] = useState(initialDraft);
  const [editing, setEditing] = useState<AnyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const loadRequestRef = useRef(0);

  const canManage = canManageData(profile);

  const loadAuthorizedNumbers = useCallback(async (forceRefresh = false) => {
    const requestId = ++loadRequestRef.current;
    setLoading(true);
    setError("");
    try {
      const data = await withAsyncTimeout(listRecords(TABLES.whatsappUsuarios, {
        fazendaId: dataContext.fazendaId,
        usuarioId: dataContext.usuarioId,
        orderBy: "created_at",
        select: WHATSAPP_USERS_SELECT,
        cache: true,
        forceRefresh
      }), "Os numeros do WhatsApp demoraram para carregar. Tente novamente.");
      if (loadRequestRef.current !== requestId) return;
      setRows(data);
    } catch (err) {
      if (loadRequestRef.current === requestId) {
        setError(getFriendlyErrorMessage(err, "Nao foi possivel carregar os numeros autorizados agora."));
      }
    } finally {
      if (loadRequestRef.current === requestId) setLoading(false);
    }
  }, [dataContext.fazendaId, dataContext.usuarioId]);

  useEffect(() => {
    void loadAuthorizedNumbers();
    return () => {
      loadRequestRef.current += 1;
    };
  }, [loadAuthorizedNumbers]);

  const totals = useMemo(() => ({
    total: rows.length,
    active: rows.filter((row) => row.ativo !== false).length,
    inactive: rows.filter((row) => row.ativo === false).length
  }), [rows]);
  const initialLoadError = Boolean(error && !rows.length && !loading);

  function updateDraft(name: keyof typeof draft, value: string | boolean) {
    setDraft((current) => ({ ...current, [name]: value }));
  }

  function startEdit(row: AnyRecord) {
    setEditing(row);
    setDraft({
      nome: String(row.nome_exibicao || ""),
      whatsapp: formatBrazilianPhone(row.telefone_e164),
      papel_bot: roleFromDatabase(row.papel_bot),
      ativo: row.ativo !== false
    });
    setSuccess("");
    setError("");
  }

  function resetForm() {
    setEditing(null);
    setDraft(initialDraft);
  }

  async function saveAuthorizedNumber(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    if (!dataContext.fazendaId) {
      setError("Não foi possível identificar o rancho atual.");
      return;
    }
    if (!isValidBrazilianPhone(draft.whatsapp)) {
      setError("Informe um WhatsApp válido com DDD.");
      return;
    }

    const normalized = normalizeWhatsappNumber(draft.whatsapp);
    const duplicated = rows.find((row) => row.id !== editing?.id && whatsappNumbersMatch(row.telefone_e164, normalized));
    if (duplicated) {
      setError("Este WhatsApp já está cadastrado na lista de números autorizados.");
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        telefone_e164: normalized,
        nome_exibicao: draft.nome.trim() || "Usuário do bot",
        papel_bot: roleToDatabase(draft.papel_bot),
        ativo: draft.ativo
      };

      if (editing?.id) {
        await updateRecord(TABLES.whatsappUsuarios, editing.id, payload, dataContext);
        setSuccess("Número autorizado atualizado.");
      } else {
        await createRecord(TABLES.whatsappUsuarios, {
          ...payload,
          fazenda_id: dataContext.fazendaId
        }, dataContext);
        setSuccess("Número autorizado cadastrado.");
      }

      resetForm();
      await loadAuthorizedNumbers(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o número.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleNumber(row: AnyRecord) {
    if (!canManage) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await updateRecord(TABLES.whatsappUsuarios, row.id, { ativo: row.ativo === false }, dataContext);
      setSuccess(row.ativo === false ? "Número ativado." : "Número desativado.");
      await loadAuthorizedNumbers(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível alterar o status.");
    } finally {
      setBusy(false);
    }
  }

  async function removeNumber(row: AnyRecord) {
    if (!canManage) return;
    const ok = window.confirm(`Excluir ${row.nome_exibicao || row.telefone_e164} da lista de números autorizados?`);
    if (!ok) return;

    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await deleteRecords(TABLES.whatsappSessoes, [{ column: "whatsapp_usuario_id", value: row.id }], dataContext);
      await deleteRecord(TABLES.whatsappUsuarios, row.id, dataContext);
      setSuccess("Número removido da lista.");
      await loadAuthorizedNumbers(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir o número.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <section className="overflow-hidden rounded-lg bg-emerald-950 p-6 text-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] md:p-8">
        <Badge tone="success">WhatsApp</Badge>
        <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">Assistente inteligente pelo WhatsApp.</h1>
        <p className="mt-4 max-w-3xl text-emerald-100">
          O bot do Rancho entende mensagens em linguagem natural e registra dados, faz consultas e gera relatórios direto pelo telefone.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="border border-[var(--border)] bg-[var(--surface)] rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <p className="text-sm font-bold text-[var(--text-2)]">Cadastrados</p>
          {loading ? <Skeleton className="mt-3 h-8 w-16" /> : <strong className="mt-2 block text-xl font-semibold">{initialLoadError ? "-" : totals.total}</strong>}
        </div>
        <div className="border border-[var(--border)] bg-[var(--surface)] rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <p className="text-sm font-bold text-[var(--text-2)]">Ativos</p>
          {loading ? <Skeleton className="mt-3 h-8 w-16" /> : <strong className="mt-2 block text-xl font-semibold text-emerald-700 dark:text-emerald-300">{initialLoadError ? "-" : totals.active}</strong>}
        </div>
        <div className="border border-[var(--border)] bg-[var(--surface)] rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <p className="text-sm font-bold text-[var(--text-2)]">Inativos</p>
          {loading ? <Skeleton className="mt-3 h-8 w-16" /> : <strong className="mt-2 block text-xl font-semibold text-[var(--text-2)]">{initialLoadError ? "-" : totals.inactive}</strong>}
        </div>
      </section>

      <section className="border border-[var(--border)] bg-[var(--surface)] rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold">Como funciona</h2>
            <p className="mt-1 text-sm text-[var(--text-2)]">
              O assistente usa inteligência artificial para entender o que você envia pelo WhatsApp.
            </p>
          </div>
          <Badge tone="success">Integração ativa</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: MessageCircle, title: "Linguagem natural", text: "Envie mensagens como se estivesse conversando. O bot entende e interpreta automaticamente." },
            { icon: Smartphone, title: "Registros pelo celular", text: "Registre ordenha, compras, vendas, estoque e eventos direto pelo WhatsApp." },
            { icon: Bot, title: "Consultas inteligentes", text: "Pergunte sobre animais, produção, financeiro ou estoque e receba respostas na hora." },
            { icon: CheckCircle2, title: "Dados sincronizados", text: "Tudo o que for registrado pelo bot aparece nas telas do sistema automaticamente." }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-lg border border-[var(--border)]/70 bg-[var(--surface)] p-4">
                <Icon className="h-7 w-7 text-emerald-600" />
                <h3 className="mt-3 text-sm font-semibold">{item.title}</h3>
                <p className="mt-1 text-xs text-[var(--text-2)]">{item.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <form onSubmit={saveAuthorizedNumber} className="border border-[var(--border)] bg-[var(--surface)] rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] md:p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <UserPlus className="h-6 w-6 text-emerald-600" />
              <div>
                <h2 className="text-[15px] font-semibold">{editing ? "Editar número autorizado" : "Novo número autorizado"}</h2>
                <p className="text-sm text-[var(--text-2)]">Somente números autorizados e ativos poderão usar o bot do Rancho.</p>
              </div>
            </div>
            {editing ? (
              <button className="rounded-lg border border-[var(--border)] p-2" type="button" onClick={resetForm}>
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          {!canManage ? (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
              Apenas administradores ou gerentes podem alterar números autorizados.
            </div>
          ) : null}

          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium">Nome ou apelido</span>
              <input className="input" value={draft.nome} onChange={(event) => updateDraft("nome", event.target.value)} placeholder="Ex: João do curral" disabled={!canManage || busy} />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">WhatsApp</span>
              <input className="input" value={draft.whatsapp} onChange={(event) => updateDraft("whatsapp", formatBrazilianPhone(event.target.value))} placeholder="(00) 00000-0000" disabled={!canManage || busy} required />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium">Função</span>
                <select className="input" value={draft.papel_bot} onChange={(event) => updateDraft("papel_bot", event.target.value)} disabled={!canManage || busy}>
                  {BOT_ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <span className="text-xs text-[var(--text-2)]">
                  {BOT_ROLE_OPTIONS.find((option) => option.value === draft.papel_bot)?.description}
                </span>
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">Status</span>
                <select className="input" value={draft.ativo ? "ativo" : "inativo"} onChange={(event) => updateDraft("ativo", event.target.value === "ativo")} disabled={!canManage || busy}>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </label>
            </div>
          </div>

          <button className="btn btn-primary mt-5 w-full" type="submit" disabled={!canManage || busy}>
            <ShieldCheck className="h-4 w-4" /> {busy ? "Salvando..." : editing ? "Salvar alterações" : "Autorizar número"}
          </button>

          {error ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{error}</p> : null}
          {success ? <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">{success}</p> : null}
        </form>

        <div className="border border-[var(--border)] bg-[var(--surface)] rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] md:p-6">
          <div className="mb-5 flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
            <div>
              <h2 className="text-[15px] font-semibold">Números autorizados</h2>
              <p className="text-sm text-[var(--text-2)]">Lista de números que podem usar o bot do Rancho.</p>
            </div>
          </div>

          <div className="space-y-3">
            {loading ? Array.from({ length: 4 }).map((_, index) => (
              <div key={`wa-skeleton-${index}`} className="rounded-lg border border-[var(--border)] p-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-3 h-4 w-56" />
              </div>
            )) : initialLoadError ? (
              <ErrorState title="Nao consegui carregar os numeros autorizados." message={error} onRetry={() => loadAuthorizedNumbers(true)} />
            ) : rows.length ? rows.map((row) => (
              <article key={row.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-lg font-semibold">{row.nome_exibicao || "Usuário do bot"}</h3>
                      <Badge tone={row.ativo === false ? "default" : "success"}>{row.ativo === false ? "Inativo" : "Ativo"}</Badge>
                    </div>
                    <p className="mt-1 text-sm font-bold text-[var(--text)]">{formatBrazilianPhone(row.telefone_e164)}</p>
                    <p className="mt-1 text-xs text-[var(--text-2)]">
                      {roleLabel(row.papel_bot)} • Cadastrado em {formatDate(row.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="rounded-lg border border-[var(--border)] p-2 hover:bg-[var(--bg)] disabled:opacity-50" type="button" onClick={() => startEdit(row)} disabled={!canManage || busy} title="Editar">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button className="btn btn-secondary px-3 py-2 text-sm disabled:opacity-50" type="button" onClick={() => toggleNumber(row)} disabled={!canManage || busy}>
                      {row.ativo === false ? "Ativar" : "Desativar"}
                    </button>
                    <button className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950" type="button" onClick={() => removeNumber(row)} disabled={!canManage || busy} title="Excluir">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            )) : (
              <EmptyState
                title="Nenhum numero autorizado cadastrado ainda."
                message="Cadastre ao menos um WhatsApp ativo para liberar o uso do bot nesta fazenda."
              />
            )}
          </div>
        </div>
      </div>

      <section className="border border-[var(--border)] bg-[var(--surface)] rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] md:p-6">
        <div className="mb-5 flex items-center gap-3">
          <Bot className="h-6 w-6 text-emerald-600" />
          <div>
            <h2 className="text-[15px] font-semibold">O que o bot pode fazer</h2>
            <p className="text-sm text-[var(--text-2)]">Exemplos de mensagens que o assistente entende.</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[
            { category: "Produção", examples: ["Mimosa deu 15 litros de leite hoje", "qual foi a produção dessa semana?"] },
            { category: "Financeiro", examples: ["vendi leite por 900 reais", "comprei ração por 300 reais"] },
            { category: "Estoque", examples: ["entrou 10 sacos de ração no estoque", "quanto tem de sal mineral?"] },
            { category: "Rebanho", examples: ["registra a vaca Estrela, brinco B-012", "qual vaca ficou mais tempo sem parir?"] },
            { category: "Eventos", examples: ["vaca 090 pariu hoje", "quais eventos aconteceram em abril?"] },
            { category: "Consultas", examples: ["me mostra tudo sobre a vaca 090", "quantos animais ativos eu tenho?"] }
          ].map((group) => (
            <div key={group.category} className="rounded-lg border border-[var(--border)]/70 bg-[var(--surface)] p-4">
              <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{group.category}</h3>
              <ul className="mt-2 space-y-1">
                {group.examples.map((ex) => (
                  <li key={ex} className="text-xs text-[var(--text-2)]">&ldquo;{ex}&rdquo;</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
