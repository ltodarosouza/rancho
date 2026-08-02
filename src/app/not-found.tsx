"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Home, LifeBuoy, MapPinned, SearchX } from "lucide-react";

export default function NotFound() {
  const pathname = usePathname();
  const router = useRouter();
  const route = pathname || "rota desconhecida";

  return (
    <main className="min-h-screen bg-[var(--bg)] px-5 py-8 text-[var(--text)] sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center">
        <section className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-200">
              <SearchX className="h-4 w-4" aria-hidden="true" />
              Erro 404
            </div>

            <div className="max-w-3xl space-y-4">
              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                Essa página saiu da rota.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[var(--text-2)] sm:text-lg">
                Não encontramos o endereço que você tentou abrir. A rota pode ter sido removida, digitada errado ou movida para outro lugar do Rancho.
              </p>
            </div>

            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="flex items-start gap-3">
                <MapPinned className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">Rota solicitada</p>
                  <p className="mt-1 break-all font-mono text-sm font-medium text-[var(--text)]">{route}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => router.back()} className="btn btn-secondary">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Voltar
              </button>
              <Link href="/dashboard" className="btn btn-primary">
                <Home className="h-4 w-4" aria-hidden="true" />
                Ir para o dashboard
              </Link>
              <Link href="/suporte" className="btn btn-secondary">
                <LifeBuoy className="h-4 w-4" aria-hidden="true" />
                Suporte
              </Link>
            </div>
          </div>

          <aside className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-emerald-700 text-white">
              <SearchX className="h-8 w-8" aria-hidden="true" />
            </div>
            <div className="mt-8 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">O que aconteceu</p>
              <h2 className="text-2xl font-semibold">Página não encontrada</h2>
              <p className="text-sm leading-6 text-[var(--text-2)]">
                O Rancho respondeu corretamente, mas não existe uma tela publicada para esse endereço.
              </p>
            </div>
            <div className="mt-8 grid gap-3 text-sm">
              <div className="rounded-lg bg-[var(--bg)] p-3">
                <span className="font-semibold">Código:</span> 404
              </div>
              <div className="rounded-lg bg-[var(--bg)] p-3">
                <span className="font-semibold">Status:</span> rota inexistente
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
