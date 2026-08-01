"use client";

import { Bell, Check, ExternalLink } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/AsyncState";
import { Skeleton } from "@/components/ui/Skeleton";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { TABLES } from "@/lib/tables";
import type { AnyRecord } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { listRecords, subscribeTable, updateRecord } from "@/services/crud";
import { withAsyncTimeout } from "@/lib/async";

const routeByEntity: Record<string, string> = {
  [TABLES.ordenhas]: "/producao",
  [TABLES.eventosAnimal]: "/eventos",
  [TABLES.transacoesFinanceiras]: "/financeiro",
  [TABLES.estoqueItens]: "/estoque",
  [TABLES.estoqueMovimentacoes]: "/estoque",
  [TABLES.registrosPonto]: "/funcionarios",
  [TABLES.funcionarios]: "/funcionarios",
  [TABLES.animais]: "/rebanho"
};

const NOTIFICATIONS_SELECT = "id,titulo,mensagem,entidade_tipo,lida_em,created_at";

function detailsHref(notification: AnyRecord) {
  return routeByEntity[String(notification.entidade_tipo || "")] || "/dashboard";
}

export function NotificationsMenu() {
  const router = useRouter();
  const { dataContext } = useAuth();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<AnyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const loadRequestRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++loadRequestRef.current;
    if (!dataContext.fazendaId) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await withAsyncTimeout(listRecords(TABLES.notificacoes, {
        fazendaId: dataContext.fazendaId,
        usuarioId: dataContext.usuarioId,
        orderBy: "created_at",
        select: NOTIFICATIONS_SELECT,
        limit: 20
      }), "As notificacoes demoraram para carregar. Tente novamente.");
      if (loadRequestRef.current !== requestId) return;
      setRows(data);
    } catch (err) {
      if (loadRequestRef.current === requestId) {
        setError(getFriendlyErrorMessage(err, "Nao foi possivel carregar as notificacoes agora."));
      }
    } finally {
      if (loadRequestRef.current === requestId) setLoading(false);
    }
  }, [dataContext.fazendaId, dataContext.usuarioId]);

  useEffect(() => {
    void load();
    const unsubscribe = subscribeTable(TABLES.notificacoes, load);
    return () => {
      loadRequestRef.current += 1;
      unsubscribe();
    };
  }, [load]);

  const unreadCount = useMemo(() => rows.filter((row) => !row.lida_em).length, [rows]);

  async function markAsRead(notification: AnyRecord) {
    if (notification.lida_em) return;

    try {
      const readAt = new Date().toISOString();
      setRows((current) => current.map((row) => row.id === notification.id ? { ...row, lida_em: readAt } : row));
      await updateRecord(TABLES.notificacoes, notification.id, { lida_em: readAt }, dataContext);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, "Não foi possível marcar a notificação como lida."));
      await load();
    }
  }

  async function openDetails(notification: AnyRecord) {
    await markAsRead(notification);
    setOpen(false);
    router.push(detailsHref(notification));
  }

  return (
    <div className="relative">
      <button
        className="relative rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 transition hover:bg-[var(--bg)]"
        type="button"
        onClick={() => setOpen((value) => !value)}
        title="Notificações"
      >
        <Bell className="h-5 w-5 text-[var(--text-2)]" />
        {unreadCount ? (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-emerald-600 px-1.5 py-0.5 text-center text-[0.65rem] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
        <button className="fixed inset-0 z-40 cursor-default bg-transparent md:hidden" type="button" aria-label="Fechar notificações" onClick={() => setOpen(false)} />
        <div className="fixed left-4 right-4 top-20 z-50 max-h-[calc(100vh-6rem)] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg md:absolute md:left-auto md:right-0 md:top-12 md:w-96">
          <div className="flex items-center justify-between border-b border-[var(--border-light)] px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Notificações</p>
              <p className="text-xs text-[var(--text-3)]">Registros feitos pelo WhatsApp e avisos internos.</p>
            </div>
            {unreadCount ? <span className="shrink-0"><Badge tone="success">{unreadCount} nova(s)</Badge></span> : null}
          </div>

          <div className="max-h-[calc(100vh-12rem)] overflow-y-auto p-2 md:max-h-[26rem]">
            {loading ? Array.from({ length: 4 }).map((_, index) => (
              <div key={`notification-skeleton-${index}`} className="rounded-lg p-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-2 h-3 w-64 max-w-full" />
              </div>
            )) : error ? (
              <ErrorState title="Nao consegui carregar notificacoes." message={error} onRetry={load} />
            ) : rows.length ? rows.map((notification) => (
              <article
                key={notification.id}
                className={cn(
                  "rounded-lg border p-3 transition",
                  notification.lida_em
                    ? "border-[var(--border)] bg-[var(--surface)]"
                    : "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/25"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words text-sm font-semibold">{notification.titulo}</h3>
                    <p className="mt-1 break-words text-sm text-[var(--text-2)]">{notification.mensagem}</p>
                    <p className="mt-2 text-xs text-[var(--text-3)]">{formatDate(notification.created_at)}</p>
                  </div>
                  {!notification.lida_em ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-600" /> : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn btn-secondary px-3 py-2 text-xs" type="button" onClick={() => openDetails(notification)}>
                    <ExternalLink className="h-3.5 w-3.5" /> Ver detalhes
                  </button>
                  {!notification.lida_em ? (
                    <button className="btn px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-50 dark:text-emerald-200 dark:hover:bg-emerald-950/40" type="button" onClick={() => markAsRead(notification)}>
                      <Check className="h-3.5 w-3.5" /> Marcar como lida
                    </button>
                  ) : null}
                </div>
              </article>
            )) : (
              <div className="rounded-lg border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--text-3)]">
                Nenhuma notificação por enquanto.
              </div>
            )}
          </div>
        </div>
        </>
      ) : null}
    </div>
  );
}
