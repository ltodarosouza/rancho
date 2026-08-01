"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, LogOut, Menu, Moon, Search, Sun, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { navGroups } from "@/components/layout/navigation";
import { NotificationsMenu } from "@/components/layout/NotificationsMenu";
import { useAuth } from "@/lib/auth-context";
import { canAccessPlatformAdmin } from "@/lib/platform-admin";
import { canViewPath } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const globalDestinations = [
  { href: "/dashboard", label: "Dashboard", helper: "Visão geral da fazenda", keywords: ["inicio", "painel", "resumo", "geral"] },
  { href: "/lotes", label: "Lotes", helper: "Grupos e manejo do rebanho", keywords: ["lote", "piquete", "manejo", "grupo"] },
  { href: "/rebanho", label: "Rebanho", helper: "Animais, brincos e fases", keywords: ["animal", "animais", "brinco", "vaca", "boi", "rebanho"] },
  { href: "/reproducao", label: "Reprodução", helper: "Inseminação, prenhez e partos", keywords: ["reproducao", "inseminacao", "prenhez", "prenhe", "pre-parto", "parto", "cio"] },
  { href: "/genealogia", label: "Genealogia", helper: "Árvore familiar dos animais", keywords: ["genealogia", "familia", "pai", "mae", "filhos", "arvore"] },
  { href: "/eventos", label: "Eventos", helper: "Vacinas, partos e tratamentos", keywords: ["evento", "vacina", "parto", "doenca", "tratamento", "pesagem"] },
  { href: "/producao", label: "Produção", helper: "Ordenhas e litros de leite", keywords: ["leite", "ordenha", "litros", "producao"] },
  { href: "/estoque", label: "Estoque", helper: "Ração, medicamentos e insumos", keywords: ["estoque", "racao", "medicamento", "insumo", "equipamento"] },
  { href: "/financeiro", label: "Financeiro", helper: "Entradas, saídas e caixa", keywords: ["dinheiro", "receita", "despesa", "financeiro", "caixa"] },
  { href: "/funcionarios", label: "Funcionários", helper: "Equipe e contatos", keywords: ["funcionario", "equipe", "colaborador", "contato"] },
  { href: "/ponto", label: "Ponto", helper: "Entradas e saídas da equipe", keywords: ["ponto", "entrada", "saida", "horario"] },
  { href: "/folha", label: "Folha", helper: "Pagamentos e descontos", keywords: ["folha", "salario", "pagamento", "desconto"] },
  { href: "/relatorios", label: "Relatórios", helper: "Resumo para impressão", keywords: ["relatorio", "pdf", "imprimir", "resultado"] },
  { href: "/whatsapp", label: "WhatsApp", helper: "Atendimento e mensagens do bot", keywords: ["whatsapp", "mensagem", "chat", "telefone"] },
  { href: "/admin-interno", label: "Admin Interno", helper: "Clientes, ranchos e convites de donos", keywords: ["admin", "interno", "clientes", "fazendas", "ranchos"] },
  { href: "/suporte", label: "Suporte", helper: "Contato para dúvidas e problemas", keywords: ["suporte", "ajuda", "email", "problema", "duvida"] },
  { href: "/configuracoes", label: "Configurações", helper: "Conta e preferências", keywords: ["configuracao", "preferencia", "conta", "perfil"] }
];

const breadcrumbMap: Record<string, string> = {
  "/dashboard": "Principal",
  "/lotes": "Rebanho",
  "/rebanho": "Rebanho",
  "/genealogia": "Rebanho",
  "/reproducao": "Rebanho",
  "/eventos": "Rebanho",
  "/producao": "Rebanho",
  "/estoque": "Estoque",
  "/financeiro": "Financeiro",
  "/relatorios": "Financeiro",
  "/funcionarios": "Equipe",
  "/ponto": "Equipe",
  "/folha": "Equipe",
  "/whatsapp": "Atendimento",
  "/admin-interno": "Sistema",
  "/suporte": "Sistema",
  "/configuracoes": "Sistema"
};

function normalizeSearch(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function findDestinations(value: string) {
  const term = normalizeSearch(value.trim());
  if (!term) return [];

  return globalDestinations
    .filter((item) => normalizeSearch(`${item.label} ${item.helper} ${item.keywords.join(" ")}`).includes(term))
    .slice(0, 6);
}

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, isDemo, signOut } = useAuth();
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const isPlatformAdmin = canAccessPlatformAdmin(profile);
  const visibleGroups = useMemo(() => (
    navGroups
      .map((group) => ({ ...group, items: group.items.filter((item) => (!item.platformOnly || isPlatformAdmin) && canViewPath(profile, item.href)) }))
      .filter((group) => group.items.length)
  ), [isPlatformAdmin, profile]);

  const searchResults = useMemo(() => (
    findDestinations(globalSearch).filter((item) => (isPlatformAdmin || item.href !== "/admin-interno") && canViewPath(profile, item.href))
  ), [globalSearch, isPlatformAdmin, profile]);

  const currentPage = useMemo(() => {
    return globalDestinations.find((item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href)));
  }, [pathname]);

  const breadcrumb = breadcrumbMap[pathname] || "Principal";

  useEffect(() => {
    const saved = localStorage.getItem("rancho-theme");
    const isDark = saved === "dark";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    localStorage.setItem("rancho-theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  }

  function goTo(href: string) {
    setGlobalSearch("");
    setSearchOpen(false);
    setOpen(false);
    router.push(href);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const firstResult = searchResults[0];
    if (firstResult) goTo(firstResult.href);
  }

  async function handleSignOut() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setLogoutError("");
    try {
      await signOut();
      router.replace("/login");
    } catch {
      setLogoutError("Não foi possível sair da conta. Tente novamente.");
      setIsLoggingOut(false);
    }
  }

  return (
    <>
      <header className="no-print fixed inset-x-0 top-0 z-40 flex h-[52px] items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface)] px-4 lg:left-56 lg:px-6">
        <div className="flex min-w-0 items-center gap-2 lg:hidden">
          <button
            className="shrink-0 rounded-md border border-[var(--border)] bg-[var(--surface)] p-1.5"
            onClick={() => setOpen((value) => !value)}
            type="button"
            aria-controls="mobile-navigation"
            aria-expanded={open}
            title={open ? "Fechar menu" : "Abrir menu"}
          >
            <Menu className="h-5 w-5" />
          </button>
          <strong className="min-w-0 truncate text-sm font-semibold">Rancho</strong>
        </div>

        <div className="hidden min-w-0 items-center gap-1.5 lg:flex">
          <span className="text-[13px] text-[var(--text-3)]">{breadcrumb} /</span>
          <span className="text-sm font-semibold text-[var(--text)]">{currentPage?.label || "Página"}</span>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <form onSubmit={submitSearch} className="relative hidden lg:block">
            <div className="flex min-w-[200px] items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1.5 text-[13px] text-[var(--text-3)] transition-colors focus-within:border-pasture focus-within:ring-2 focus-within:ring-pasture/10">
              <Search className="h-3.5 w-3.5" />
              <input
                className="w-full bg-transparent text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-3)]"
                placeholder="Buscar página..."
                value={globalSearch}
                onBlur={() => window.setTimeout(() => setSearchOpen(false), 120)}
                onChange={(event) => {
                  setGlobalSearch(event.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    const firstResult = searchResults[0];
                    if (firstResult) {
                      event.preventDefault();
                      goTo(firstResult.href);
                    }
                  }
                }}
              />
              <kbd className="rounded border border-[var(--border)] bg-[var(--surface)] px-1 py-0.5 text-[10px] text-[var(--text-3)]">Ctrl K</kbd>
            </div>

            {searchOpen && globalSearch.trim() ? (
              <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg">
                {searchResults.length ? searchResults.map((item) => (
                  <button
                    key={item.href}
                    className="flex w-full items-center justify-between gap-4 px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg)]"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => goTo(item.href)}
                    type="button"
                  >
                    <span>
                      <span className="block text-sm font-semibold">{item.label}</span>
                      <span className="block text-xs text-[var(--text-2)]">{item.helper}</span>
                    </span>
                  </button>
                )) : (
                  <div className="px-3 py-2.5 text-sm text-[var(--text-3)]">Nenhum atalho encontrado.</div>
                )}
              </div>
            ) : null}
          </form>

          <NotificationsMenu />
          <button onClick={toggleTheme} className="flex h-[34px] w-[34px] items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] transition-colors hover:bg-[var(--bg)]" type="button" title="Tema">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {logoutError ? <span className="hidden text-xs font-semibold text-red-600 dark:text-red-400 md:inline">{logoutError}</span> : null}
          {!isDemo ? (
            <button onClick={handleSignOut} disabled={isLoggingOut} className="flex h-[34px] w-[34px] items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] transition-colors hover:bg-[var(--bg)] disabled:opacity-60" type="button" title={isLoggingOut ? "Saindo da conta..." : "Sair"}>
              {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            </button>
          ) : null}
        </div>
      </header>

      {isLoggingOut ? (
        <div className="no-print fixed inset-x-0 top-[52px] z-40 border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-center text-sm font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100 lg:left-56">
          Saindo da conta...
        </div>
      ) : null}

      {open ? (
        <div className="no-print lg:hidden">
          <button
            className="fixed inset-0 z-40 cursor-default bg-black/40"
            type="button"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
          />
          <section
            id="mobile-navigation"
            className="fixed inset-x-0 bottom-0 top-[52px] z-50 flex flex-col overflow-hidden bg-[var(--surface)]"
          >
            <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4">
              {visibleGroups.map((group) => (
                <section key={group.label}>
                  <p className="mb-2 px-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-3)]">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex min-w-0 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-[var(--text)] transition-colors",
                            active ? "bg-pasture/10 text-pasture dark:text-emerald-300" : "hover:bg-[var(--bg)]"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0 opacity-70" />
                          <span className="min-w-0 truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </nav>

            <div className="border-t border-[var(--border)] p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{profile?.nome || "Usuário"}</p>
                  <p className="truncate text-xs text-[var(--text-2)]">{profile?.fazenda?.nome || "Fazenda"}</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-2)]"
                  type="button"
                  title="Fechar menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
