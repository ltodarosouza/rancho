"use client";

import {
  ArrowRight,
  BarChart3,
  Bot,
  ChevronDown,
  ChevronRight,
  Database,
  Droplets,
  Home,
  Leaf,
  Loader2,
  MessageCircle,
  Minus,
  PackageOpen,
  PawPrint,
  Plus,
  RotateCcw,
  Search,
  Send,
  Trash2,
  TrendingUp,
  Wallet,
  X
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  INITIAL_DEMO_STORE
} from "@/lib/marketing/demo-store";

/* ═══════════════════════════════════════════════════════
   DEMO DATA
   ═══════════════════════════════════════════════════════ */

type DemoAnimal = { name: string; code: string; category: string; phase: string };
type DemoTransaction = { id: number; label: string; date: string; value: number; positive: boolean };
type DemoStock = { name: string; qty: number; unit: string; min: number };
type DemoProduction = { id: number; animal: string; liters: number; date: string };
type DemoStore = { animals: DemoAnimal[]; transactions: DemoTransaction[]; stock: DemoStock[]; production: DemoProduction[] };

const INITIAL_ANIMALS: DemoAnimal[] = [
  { name: "Mimosa", code: "B-001", category: "Vaca", phase: "Lactação" },
  { name: "Branquinha", code: "V-403", category: "Vaca", phase: "Pré-parto" },
  { name: "Imperador", code: "T-007", category: "Touro", phase: "Reprodução" },
  { name: "Aurora", code: "C-396", category: "Bezerra", phase: "Crescimento" },
  { name: "Estrela", code: "B-012", category: "Vaca", phase: "Lactação" },
  { name: "Luna", code: "N-401", category: "Novilha", phase: "Recria" }
];

const INITIAL_TRANSACTIONS: DemoTransaction[] = [
  { id: 1, label: "Venda de leite", date: "Hoje", value: 1280, positive: true },
  { id: 2, label: "Compra de ração", date: "Ontem", value: 960, positive: false },
  { id: 3, label: "Vacina clostridial", date: "28/07", value: 180, positive: false },
  { id: 4, label: "Venda de bezerro", date: "25/07", value: 3200, positive: true },
  { id: 5, label: "Sal mineral", date: "22/07", value: 240, positive: false }
];

const INITIAL_STOCK: DemoStock[] = [
  { name: "Ração bovina", qty: 45, unit: "sacos", min: 10 },
  { name: "Sal mineral", qty: 12, unit: "pacotes", min: 5 },
  { name: "Vacina clostridial", qty: 8, unit: "doses", min: 3 },
  { name: "Vermífugo", qty: 15, unit: "doses", min: 5 }
];

const PRODUCTION_DATA = [
  { animal: "Mimosa (B-001)", liters: 28 },
  { animal: "Estrela (B-012)", liters: 31 }
];

const CATEGORIES = ["Todos", "Vaca", "Touro", "Bezerra", "Novilha", "Bezerro"];

/* ═══════════════════════════════════════════════════════
   BOT DEMO — suggested messages with pre-computed answers
   ═══════════════════════════════════════════════════════ */

type BotExample = { label: string; text: string; answer: string };

const BOT_EXAMPLES: BotExample[] = [
  {
    label: "Produção",
    text: "Mimosa deu 28 litros hoje",
    answer: "Entendi: registrar 28 litros de leite para Mimosa (B-001) hoje.\n\n1 - Confirmar  2 - Corrigir"
  },
  {
    label: "Estoque",
    text: "comprei 10 sacos de ração por 800 reais",
    answer: "Encontrei a ração no estoque. Vou registrar a entrada de 10 sacos e a despesa de R$ 800,00.\n\n1 - Confirmar  2 - Corrigir"
  },
  {
    label: "Reprodução",
    text: "a vaca Mimosa pariu uma bezerra hoje",
    answer: "Registrando parto da Mimosa (B-001). Qual o identificador da cria? Exemplo: B-050"
  },
  {
    label: "Financeiro",
    text: "qual o saldo do mês?",
    answer: "Financeiro do mês:\n• Entradas: R$ 8.420,00\n• Saídas: R$ 4.140,00\n• Saldo: R$ 4.280,00"
  },
  {
    label: "Consulta",
    text: "quantos litros produziram hoje?",
    answer: "Produção de hoje: 59 litros\n• Mimosa (B-001): 28L\n• Estrela (B-012): 31L"
  }
];

/* ═══════════════════════════════════════════════════════
   BOT LANDING DEMO
   ═══════════════════════════════════════════════════════ */

type ChatMessage = { role: "user" | "bot"; text: string };

function DatabasePanel({ expanded, onToggle, store }: { expanded: boolean; onToggle: () => void; store: DemoStore }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04]">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-xs font-semibold text-slate-300 lg:cursor-default">
        <span className="flex items-center gap-2"><Database className="h-3.5 w-3.5 text-emerald-400" /> Dados da fazenda demonstrativa</span>
        <ChevronDown className={`h-3.5 w-3.5 transition lg:hidden ${expanded ? "rotate-180" : ""}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${expanded ? "max-h-[500px]" : "max-h-0 lg:max-h-[500px]"}`}>
        <div className="space-y-3 border-t border-white/10 px-4 py-3 text-[11px]">
          <div>
            <p className="mb-1.5 font-semibold text-emerald-300">Animais ({store.animals.length})</p>
            <div className="space-y-1 text-slate-400">
              {store.animals.slice(0, 8).map((a) => (
                <p key={a.code}><span className="text-slate-200">{a.name}</span> ({a.code}) · {a.category} · {a.phase}</p>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 font-semibold text-emerald-300">Estoque</p>
            <div className="space-y-1 text-slate-400">
              {store.stock.map((s) => (
                <p key={s.name}><span className="text-slate-200">{s.name}</span> · {s.qty} {s.unit}</p>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 font-semibold text-emerald-300">Produção de hoje</p>
            <p className="text-slate-400">{store.production.slice(0, 4).map((item) => `${item.animal} ${item.liters}L`).join(" · ")} · <span className="text-slate-200">Total {store.production.reduce((sum, item) => sum + item.liters, 0)}L</span></p>
          </div>
          <div>
            <p className="mb-1.5 font-semibold text-emerald-300">Financeiro</p>
            <p className="text-slate-400">Saldo: <span className="text-slate-200">R$ {store.transactions.reduce((sum, item) => sum + (item.positive ? item.value : -item.value), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

type BotLandingDemoProps = { store: DemoStore; onStoreChange: (store: DemoStore) => void };

export function BotLandingDemo({ store, onStoreChange }: BotLandingDemoProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "bot", text: "Olá! Sou o bot demonstrativo do Rancho. Você pode me enviar mensagens sobre produção, estoque, financeiro, reprodução e muito mais. Use os dados da fazenda ao lado como referência." }
  ]);
  const [input, setInput] = useState("");
  const [freeUses, setFreeUses] = useState(3);
  const [busy, setBusy] = useState(false);
  const [dbExpanded, setDbExpanded] = useState(false);
  const [pendingAction, setPendingAction] = useState<Record<string, unknown> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    const el = messagesEndRef.current;
    if (!el) return;
    const container = el.closest("[data-chat-scroll]");
    if (container) container.scrollTop = container.scrollHeight;
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const availableSuggestions = useMemo(
    () => BOT_EXAMPLES.filter((ex) => !messages.some((m) => m.role === "user" && m.text === ex.text)),
    [messages]
  );

  async function sendMessage(text: string, countUse: boolean) {
    const replyingToPendingAction = Boolean(pendingAction);
    if (!text.trim() || busy || (countUse && freeUses <= 0 && !replyingToPendingAction)) return;
    setInput("");
    if (countUse && !replyingToPendingAction) setFreeUses((n) => n - 1);
    setMessages((prev) => [...prev, { role: "user", text }]);
    setBusy(true);

    try {
      const res = await fetch("/api/demo/bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, store, pendingAction })
      });
      const data = await res.json().catch(() => ({}));
      if (data.store) onStoreChange(data.store as DemoStore);
      setPendingAction(data.pendingAction || null);
      setMessages((prev) => [...prev, { role: "bot", text: data.response || "Não consegui processar. Tente uma mensagem sugerida." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "bot", text: "Erro de conexão. Tente novamente." }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function sendFreeMessage(text: string) { void sendMessage(text, true); }
  function sendSuggested(example: BotExample) { void sendMessage(example.text, false); }

  function reset() {
    setMessages([{ role: "bot", text: "Demonstração reiniciada. Envie uma mensagem para testar o bot." }]);
    setFreeUses(3);
    setInput("");
    setPendingAction(null);
    onStoreChange(JSON.parse(JSON.stringify(INITIAL_DEMO_STORE)) as DemoStore);
  }

  return (
    <section className="bg-[#0f1a14] px-4 py-14 text-white sm:px-8 sm:py-20" data-marketing-section="demo-bot" data-section-label="Demo do bot">
      <div className="mx-auto max-w-6xl">
        <div className="reveal-on-scroll mx-auto mb-8 max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
            <Bot className="h-3.5 w-3.5" /> Teste o bot
          </span>
          <h2 className="mt-4 text-2xl font-semibold sm:text-3xl">
            Envie uma mensagem e veja o que o bot faria.
          </h2>
          <p className="mt-3 text-base text-slate-300">
            Experimente mensagens prontas ou escreva as suas. Dados fictícios, sem cadastro.
          </p>
        </div>

        <div className="reveal-on-scroll grid gap-4 lg:grid-cols-[0.38fr_0.62fr] lg:items-start">
          {/* Database panel */}
          <div className="space-y-3">
            <DatabasePanel expanded={dbExpanded} onToggle={() => setDbExpanded(!dbExpanded)} store={store} />
            <div className="hidden items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 lg:flex">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                <MessageCircle className="h-4 w-4" />
              </span>
              <div className="text-sm">
                <p className="font-semibold">{freeUses} {freeUses === 1 ? "mensagem livre restante" : "mensagens livres restantes"}</p>
                <p className="text-xs text-slate-400">Mensagens sugeridas são ilimitadas</p>
              </div>
            </div>
          </div>

          {/* Chat */}
          <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1a2421] shadow-2xl shadow-black/30">
            {/* Chat header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-[#202c29] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white">
                  <Bot className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Rancho Bot</p>
                  <p className="text-[10px] text-emerald-300">Demonstração · dados fictícios</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-medium text-slate-400 lg:hidden">{freeUses}/3 livres</span>
                <button type="button" onClick={reset} aria-label="Reiniciar" className="rounded-md p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-white">
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div data-chat-scroll className="flex h-[320px] flex-col gap-2.5 overflow-y-auto p-4 sm:h-[370px] [scrollbar-width:thin]">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[88%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    msg.role === "user"
                      ? "rounded-br-md bg-emerald-700 text-white"
                      : "rounded-bl-md bg-white/10 text-slate-200"
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {busy ? (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-white/10 px-3.5 py-2.5 text-[13px] text-slate-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processando...
                  </div>
                </div>
              ) : null}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions + input */}
            <div className="border-t border-white/10 bg-[#202c29] p-3">
              {availableSuggestions.length > 0 ? (
                <div className="mb-2.5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                  {availableSuggestions.map((ex) => (
                    <button
                      key={ex.text}
                      type="button"
                      onClick={() => sendSuggested(ex)}
                      disabled={busy}
                      className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-200 transition hover:bg-emerald-400/20 disabled:opacity-50"
                    >
                      {ex.label}: &ldquo;{ex.text.length > 25 ? `${ex.text.slice(0, 25)}…` : ex.text}&rdquo;
                    </button>
                  ))}
                </div>
              ) : null}

              <form
                onSubmit={(e) => { e.preventDefault(); sendFreeMessage(input); }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={(freeUses <= 0 && !pendingAction) || busy}
                  placeholder={freeUses > 0 ? `Escreva sua mensagem (${freeUses} restante${freeUses > 1 ? "s" : ""})...` : pendingAction ? "Confirme ou cancele a ação acima..." : "Mensagens livres esgotadas"}
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-[13px] text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/40 disabled:cursor-not-allowed disabled:opacity-50"
                  maxLength={300}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || (freeUses <= 0 && !pendingAction) || busy}
                  aria-label="Enviar"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white transition hover:bg-emerald-500 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>

              {freeUses <= 0 ? (
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                  <span>As mensagens sugeridas continuam funcionando.</span>
                  <div className="flex items-center gap-3">
                    <Link href="/login" className="inline-flex items-center gap-1 font-semibold text-emerald-300 transition hover:text-emerald-200">
                      Entrar no sistema <ArrowRight className="h-3 w-3" />
                    </Link>
                    <button type="button" onClick={reset} className="text-slate-500 transition hover:text-white">
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   INTERACTIVE PRODUCT SHOWCASE
   ═══════════════════════════════════════════════════════ */

type ShowcaseTab = "dashboard" | "rebanho" | "producao" | "financeiro" | "estoque";

const TABS: { key: ShowcaseTab; label: string; icon: typeof Home }[] = [
  { key: "dashboard", label: "Dashboard", icon: Home },
  { key: "rebanho", label: "Rebanho", icon: PawPrint },
  { key: "producao", label: "Produção", icon: Droplets },
  { key: "financeiro", label: "Financeiro", icon: Wallet },
  { key: "estoque", label: "Estoque", icon: PackageOpen }
];

function Sidebar({ active, onNavigate }: { active: ShowcaseTab; onNavigate: (tab: ShowcaseTab) => void }) {
  return (
    <aside className="hidden w-48 shrink-0 flex-col border-r border-[#1e2620] bg-[#141C17] sm:flex">
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 pb-4 pt-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#16803C] text-white"><PawPrint className="h-3.5 w-3.5" /></span>
        <div>
          <p className="text-[12px] font-semibold text-[#E8EDE9]">Rancho</p>
          <p className="text-[9px] text-[#A3B0A7]">Gestão agropecuária</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-2">
        <p className="px-2 pb-1 pt-3 text-[9px] font-semibold uppercase tracking-wider text-[#A3B0A7]/50">Principal</p>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onNavigate(tab.key)}
              className={`relative flex w-full items-center gap-2 rounded-[5px] px-2 py-[7px] text-[12px] font-medium transition ${
                isActive
                  ? "bg-[#16803C]/[0.15] text-emerald-300"
                  : "text-[#A3B0A7] hover:bg-white/[0.06] hover:text-[#D0D7D2]"
              }`}
            >
              {isActive ? <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r bg-[#16803C]" /> : null}
              <Icon className={`h-3.5 w-3.5 ${isActive ? "opacity-100" : "opacity-70"}`} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div className="flex items-center gap-2 border-t border-[#1e2620] px-3 py-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#16803C]/30 text-[10px] font-semibold text-emerald-300">A</span>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium text-[#D0D7D2]">Administrador</p>
          <p className="truncate text-[9px] text-[#A3B0A7]">Fazenda Modelo</p>
        </div>
      </div>
    </aside>
  );
}

function ShowcaseHeader({ tab }: { tab: ShowcaseTab }) {
  const labels: Record<ShowcaseTab, [string, string]> = {
    dashboard: ["Principal", "Dashboard"],
    rebanho: ["Rebanho", "Animais"],
    producao: ["Produção", "Registros de leite"],
    financeiro: ["Financeiro", "Transações"],
    estoque: ["Estoque", "Visão do estoque"]
  };
  const [group, page] = labels[tab];
  return (
    <div className="flex h-[42px] items-center justify-between border-b border-[#E2E4EA] bg-white px-3 sm:px-4">
      <div className="flex items-center gap-1.5 text-[11px]">
        <span className="text-[#9CA3AF]">{group}</span>
        <ChevronRight className="h-3 w-3 text-[#9CA3AF]" />
        <span className="font-semibold text-[#111318]">{page}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="hidden rounded-md border border-[#E2E4EA] px-2 py-1 text-[10px] text-[#9CA3AF] sm:inline-flex"><Search className="mr-1 inline h-3 w-3" /> Buscar</span>
        <span className="h-6 w-6 rounded-md border border-[#E2E4EA] bg-white" />
      </div>
    </div>
  );
}

function MetricCard({ label, value, badge, tone = "green" }: { label: string; value: string; badge: string; tone?: "green" | "blue" | "amber" | "red" }) {
  const colors = { green: "bg-emerald-50 text-emerald-700", blue: "bg-blue-50 text-blue-700", amber: "bg-amber-50 text-amber-700", red: "bg-red-50 text-red-700" };
  return (
    <div className="rounded-lg border border-[#E2E4EA] bg-white p-3">
      <p className="text-[10px] font-medium text-[#9CA3AF]">{label}</p>
      <p className="mt-1.5 text-base font-bold tabular-nums text-[#111318] sm:text-lg">{value}</p>
      <span className={`mt-1.5 inline-flex rounded px-1.5 py-0.5 text-[9px] font-semibold ${colors[tone]}`}>{badge}</span>
    </div>
  );
}

/* ── Dashboard ── */

function DashboardView({ animalCount, totalIncome, totalExpense, stock, production }: { animalCount: number; totalIncome: number; totalExpense: number; stock: DemoStock[]; production: DemoProduction[] }) {
  const balance = totalIncome - totalExpense;
  const totalProduction = production.reduce((sum, item) => sum + item.liters, 0);
  return (
    <div className="space-y-3 p-3 sm:p-4">
      <div className="rounded-lg bg-[#0f1a14] p-4 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-300">Resumo da fazenda</p>
            <h3 className="mt-1.5 text-base font-semibold sm:text-lg">Tudo em um só lugar.</h3>
          </div>
          <TrendingUp className="h-4 w-4 shrink-0 text-emerald-300" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MetricCard label="Animais ativos" value={String(animalCount)} badge={`${animalCount} cadastrados`} />
        <MetricCard label="Produção hoje" value={`${totalProduction} L`} badge="Atualizado" tone="blue" />
        <MetricCard label="Saldo do mês" value={`R$ ${(balance / 1000).toFixed(1).replace(".", ",")}k`} badge="Atualizado" tone="green" />
        <MetricCard label="Itens baixos" value={String(stock.filter((s) => s.qty <= s.min * 2).length)} badge="Ver estoque" tone="amber" />
      </div>
      <div className="grid gap-3 sm:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-lg border border-[#E2E4EA] bg-white p-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-[#111318]">Produção — últimos 7 dias</p>
            <Droplets className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div className="mt-4 flex h-20 items-end gap-1.5">
            {[42, 58, 49, 68, 57, 78, 59].map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-t bg-emerald-400 transition-all duration-500" style={{ height: `${h}%` }} />
                <span className="text-[8px] text-[#9CA3AF]">{["S", "T", "Q", "Q", "S", "S", "D"][i]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-[11px] font-bold text-amber-900">Atenção</p>
          <p className="mt-1.5 text-[10px] leading-relaxed text-amber-800">{stock.filter((s) => s.qty <= s.min * 2).length} itens do estoque estão próximos do mínimo.</p>
          <button type="button" className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-amber-900">Ver estoque <ChevronRight className="h-3 w-3" /></button>
        </div>
      </div>
    </div>
  );
}

/* ── Rebanho ── */

function RebanhoView({ animals, onAdd, onRemove }: { animals: DemoAnimal[]; onAdd: (a: DemoAnimal) => void; onRemove: (code: string) => void }) {
  const [filter, setFilter] = useState("Todos");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", category: "Vaca", phase: "Crescimento" });
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const filtered = filter === "Todos" ? animals : animals.filter((a) => a.category === filter);
  const counts = useMemo(() => {
    const map: Record<string, number> = { Todos: animals.length };
    for (const a of animals) map[a.category] = (map[a.category] || 0) + 1;
    return map;
  }, [animals]);

  function handleAdd() {
    if (!form.name.trim() || !form.code.trim()) return;
    onAdd({ ...form, name: form.name.trim(), code: form.code.trim() });
    setJustAdded(form.code.trim());
    setForm({ name: "", code: "", category: "Vaca", phase: "Crescimento" });
    setAdding(false);
    setTimeout(() => setJustAdded(null), 2000);
  }

  return (
    <div className="p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#111318]">Rebanho</p>
          <p className="mt-0.5 text-[10px] text-[#9CA3AF]">{animals.length} animais ativos cadastrados</p>
        </div>
        <button
          type="button"
          onClick={() => setAdding(!adding)}
          className="inline-flex items-center gap-1 rounded-md bg-[#16803C] px-2.5 py-1.5 text-[10px] font-semibold text-white transition hover:bg-emerald-600"
        >
          {adding ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {adding ? "Cancelar" : "Adicionar"}
        </button>
      </div>

      {/* Add form */}
      {adding ? (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="mb-2 text-[10px] font-semibold text-emerald-800">Novo animal</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome" className="rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-[11px] text-[#111318] outline-none focus:border-[#16803C]" />
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Código (ex: B-050)" className="rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-[11px] text-[#111318] outline-none focus:border-[#16803C]" />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-[11px] text-[#111318] outline-none">
              {CATEGORIES.slice(1).map((c) => <option key={c}>{c}</option>)}
            </select>
            <button type="button" onClick={handleAdd} disabled={!form.name.trim() || !form.code.trim()} className="rounded-md bg-[#16803C] px-2 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50">
              Salvar
            </button>
          </div>
        </div>
      ) : null}

      {/* Filter pills */}
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        {CATEGORIES.filter((c) => c === "Todos" || (counts[c] || 0) > 0).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilter(cat)}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${
              filter === cat ? "bg-emerald-100 text-emerald-800" : "bg-[#F3F4F6] text-[#9CA3AF] hover:text-[#5F6577]"
            }`}
          >
            {cat} · {counts[cat] || 0}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="mt-3 overflow-hidden rounded-lg border border-[#E2E4EA]">
        <div className="grid grid-cols-[1.3fr_0.7fr_0.7fr_auto] gap-2 bg-[#F3F4F6] px-3 py-2 text-[9px] font-bold uppercase tracking-wide text-[#9CA3AF]">
          <span>Animal</span><span>Categoria</span><span>Fase</span><span />
        </div>
        {filtered.length === 0 ? (
          <div className="px-3 py-6 text-center text-[11px] text-[#9CA3AF]">Nenhum animal nesta categoria.</div>
        ) : filtered.map((animal) => (
          <div
            key={animal.code}
            className={`grid grid-cols-[1.3fr_0.7fr_0.7fr_auto] items-center gap-2 border-t border-[#E2E4EA] px-3 py-2 text-[10px] text-[#5F6577] transition-colors ${
              justAdded === animal.code ? "bg-emerald-50" : ""
            }`}
          >
            <div>
              <p className="font-semibold text-[#111318]">{animal.name}</p>
              <p className="text-[9px] text-[#9CA3AF]">{animal.code}</p>
            </div>
            <span>{animal.category}</span>
            <span className="flex items-center gap-1">
              <i className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {animal.phase}
            </span>
            <button
              type="button"
              onClick={() => onRemove(animal.code)}
              className="rounded p-1 text-[#9CA3AF] transition hover:bg-red-50 hover:text-red-500"
              aria-label={`Remover ${animal.name}`}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Financeiro ── */

function FinanceiroView({ transactions, onAdd, onRemove }: { transactions: DemoTransaction[]; onAdd: (t: DemoTransaction) => void; onRemove: (id: number) => void }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ label: "", value: "", positive: true });

  const income = transactions.filter((t) => t.positive).reduce((sum, t) => sum + t.value, 0);
  const expense = transactions.filter((t) => !t.positive).reduce((sum, t) => sum + t.value, 0);
  const balance = income - expense;

  function handleAdd() {
    const value = parseFloat(form.value.replace(",", "."));
    if (!form.label.trim() || isNaN(value) || value <= 0) return;
    onAdd({ id: Date.now(), label: form.label.trim(), date: "Agora", value, positive: form.positive });
    setForm({ label: "", value: "", positive: true });
    setAdding(false);
  }

  function fmt(v: number) { return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`; }

  return (
    <div className="space-y-3 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#111318]">Financeiro</p>
          <p className="mt-0.5 text-[10px] text-[#9CA3AF]">Receitas, despesas e resultado do período.</p>
        </div>
        <button
          type="button"
          onClick={() => setAdding(!adding)}
          className="inline-flex items-center gap-1 rounded-md bg-[#16803C] px-2.5 py-1.5 text-[10px] font-semibold text-white transition hover:bg-emerald-600"
        >
          {adding ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {adding ? "Cancelar" : "Nova transação"}
        </button>
      </div>

      {/* Add form */}
      {adding ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="mb-2 text-[10px] font-semibold text-emerald-800">Nova transação</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Descrição" className="rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-[11px] text-[#111318] outline-none focus:border-[#16803C]" />
            <input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="Valor (ex: 500)" type="text" inputMode="decimal" className="rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-[11px] text-[#111318] outline-none focus:border-[#16803C]" />
            <div className="flex gap-1">
              <button type="button" onClick={() => setForm({ ...form, positive: true })} className={`flex-1 rounded-md px-2 py-1.5 text-[10px] font-semibold transition ${form.positive ? "bg-emerald-600 text-white" : "border border-emerald-200 bg-white text-[#5F6577]"}`}>Receita</button>
              <button type="button" onClick={() => setForm({ ...form, positive: false })} className={`flex-1 rounded-md px-2 py-1.5 text-[10px] font-semibold transition ${!form.positive ? "bg-red-500 text-white" : "border border-emerald-200 bg-white text-[#5F6577]"}`}>Despesa</button>
            </div>
            <button type="button" onClick={handleAdd} disabled={!form.label.trim() || !form.value.trim()} className="rounded-md bg-[#16803C] px-2 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50">
              Salvar
            </button>
          </div>
        </div>
      ) : null}

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2">
        <MetricCard label="Entradas" value={fmt(income)} badge={`${transactions.filter((t) => t.positive).length} registros`} />
        <MetricCard label="Saídas" value={fmt(expense)} badge={`${transactions.filter((t) => !t.positive).length} registros`} tone="amber" />
        <MetricCard label="Resultado" value={fmt(balance)} badge={balance >= 0 ? "Positivo" : "Negativo"} tone={balance >= 0 ? "blue" : "red"} />
      </div>

      {/* Transaction list */}
      <div className="rounded-lg border border-[#E2E4EA] bg-white p-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold text-[#111318]">Movimentações recentes</p>
          <BarChart3 className="h-3.5 w-3.5 text-[#9CA3AF]" />
        </div>
        <div className="mt-2 divide-y divide-[#E2E4EA]">
          {transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-2 py-2 text-[10px]">
              <div className="min-w-0">
                <p className="truncate font-semibold text-[#111318]">{t.label}</p>
                <p className="text-[9px] text-[#9CA3AF]">{t.date}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-bold tabular-nums ${t.positive ? "text-emerald-700" : "text-[#111318]"}`}>
                  {t.positive ? "+" : "-"}R$ {t.value.toLocaleString("pt-BR")}
                </span>
                <button type="button" onClick={() => onRemove(t.id)} className="rounded p-0.5 text-[#9CA3AF] transition hover:text-red-500" aria-label="Remover">
                  <Minus className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Estoque ── */

function ProductionView({ production, onAdd }: { production: DemoProduction[]; onAdd: (item: DemoProduction) => void }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ animal: "", liters: "" });
  const total = production.reduce((sum, item) => sum + item.liters, 0);

  function handleAdd() {
    const liters = Number(form.liters.replace(",", "."));
    if (!form.animal.trim() || !Number.isFinite(liters) || liters <= 0) return;
    onAdd({ id: Date.now(), animal: form.animal.trim(), liters, date: "Agora" });
    setForm({ animal: "", liters: "" });
    setAdding(false);
  }

  return (
    <div className="p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#111318]">Produção de leite</p>
          <p className="mt-0.5 text-[10px] text-[#9CA3AF]">{production.length} registros · {total.toLocaleString("pt-BR")} litros</p>
        </div>
        <button type="button" onClick={() => setAdding(!adding)} className="inline-flex items-center gap-1 rounded-md bg-[#16803C] px-2.5 py-1.5 text-[10px] font-semibold text-white transition hover:bg-emerald-600">
          {adding ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {adding ? "Cancelar" : "Registrar"}
        </button>
      </div>
      {adding ? (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="mb-2 text-[10px] font-semibold text-emerald-800">Novo registro</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <input value={form.animal} onChange={(e) => setForm({ ...form, animal: e.target.value })} placeholder="Animal ou código" className="rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-[11px] text-[#111318] outline-none focus:border-[#16803C]" />
            <input value={form.liters} onChange={(e) => setForm({ ...form, liters: e.target.value })} placeholder="Litros" inputMode="decimal" className="rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-[11px] text-[#111318] outline-none focus:border-[#16803C]" />
            <button type="button" onClick={handleAdd} disabled={!form.animal.trim() || !form.liters.trim()} className="rounded-md bg-[#16803C] px-2 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50">Salvar</button>
          </div>
        </div>
      ) : null}
      <div className="mt-3 overflow-hidden rounded-lg border border-[#E2E4EA] bg-white">
        {production.map((item) => (
          <div key={item.id} className="flex items-center justify-between border-b border-[#E2E4EA] px-3 py-2.5 last:border-0">
            <div><p className="text-[11px] font-semibold text-[#111318]">{item.animal}</p><p className="text-[9px] text-[#9CA3AF]">{item.date}</p></div>
            <span className="text-[12px] font-bold tabular-nums text-blue-700">{item.liters.toLocaleString("pt-BR")} L</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EstoqueView({ stock, onAdd }: { stock: DemoStock[]; onAdd: (item: DemoStock) => void }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", qty: "", unit: "sacos" });

  function handleAdd() {
    const qty = parseInt(form.qty, 10);
    if (!form.name.trim() || isNaN(qty) || qty <= 0) return;
    onAdd({ name: form.name.trim(), qty, unit: form.unit, min: Math.floor(qty * 0.2) });
    setForm({ name: "", qty: "", unit: "sacos" });
    setAdding(false);
  }

  return (
    <div className="p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#111318]">Estoque</p>
          <p className="mt-0.5 text-[10px] text-[#9CA3AF]">{stock.length} itens cadastrados</p>
        </div>
        <button type="button" onClick={() => setAdding(!adding)} className="inline-flex items-center gap-1 rounded-md bg-[#16803C] px-2.5 py-1.5 text-[10px] font-semibold text-white transition hover:bg-emerald-600">
          {adding ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {adding ? "Cancelar" : "Novo item"}
        </button>
      </div>

      {adding ? (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="mb-2 text-[10px] font-semibold text-emerald-800">Novo item de estoque</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do item" className="rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-[11px] text-[#111318] outline-none focus:border-[#16803C]" />
            <input value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} placeholder="Quantidade" type="text" inputMode="numeric" className="rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-[11px] text-[#111318] outline-none focus:border-[#16803C]" />
            <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-[11px] text-[#111318] outline-none">
              <option>sacos</option><option>pacotes</option><option>doses</option><option>litros</option><option>kg</option>
            </select>
            <button type="button" onClick={handleAdd} disabled={!form.name.trim() || !form.qty.trim()} className="rounded-md bg-[#16803C] px-2 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50">Salvar</button>
          </div>
        </div>
      ) : null}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {stock.map((item) => {
          const low = item.qty <= item.min * 1.5;
          return (
            <div key={item.name} className={`rounded-lg border p-3 ${low ? "border-amber-200 bg-amber-50" : "border-[#E2E4EA] bg-white"}`}>
              <div className="flex items-center justify-between">
                <p className={`text-[11px] font-bold ${low ? "text-amber-900" : "text-[#111318]"}`}>{item.name}</p>
                {low ? <span className="rounded px-1.5 py-0.5 text-[8px] font-semibold bg-amber-200 text-amber-900">Baixo</span> : null}
              </div>
              <p className="mt-1 text-lg font-bold tabular-nums text-[#111318]">{item.qty} <span className="text-[11px] font-normal text-[#9CA3AF]">{item.unit}</span></p>
              <p className="mt-0.5 text-[9px] text-[#9CA3AF]">Mínimo: {item.min} {item.unit}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main showcase ── */

export function LandingInteractiveExperience() {
  const [store, setStore] = useState<DemoStore>(() => JSON.parse(JSON.stringify(INITIAL_DEMO_STORE)) as DemoStore);

  return (
    <>
      <BotLandingDemo store={store} onStoreChange={setStore} />
      <InteractiveProductShowcase store={store} onStoreChange={setStore} />
    </>
  );
}

type InteractiveProductShowcaseProps = { store: DemoStore; onStoreChange: (store: DemoStore) => void };

export function InteractiveProductShowcase({ store, onStoreChange }: InteractiveProductShowcaseProps) {
  const [active, setActive] = useState<ShowcaseTab>("dashboard");

  const addAnimal = useCallback((a: DemoAnimal) => onStoreChange({ ...store, animals: [a, ...store.animals] }), [onStoreChange, store]);
  const removeAnimal = useCallback((code: string) => onStoreChange({ ...store, animals: store.animals.filter((a) => a.code !== code) }), [onStoreChange, store]);
  const addTransaction = useCallback((t: DemoTransaction) => onStoreChange({ ...store, transactions: [t, ...store.transactions] }), [onStoreChange, store]);
  const removeTransaction = useCallback((id: number) => onStoreChange({ ...store, transactions: store.transactions.filter((t) => t.id !== id) }), [onStoreChange, store]);
  const addStock = useCallback((item: DemoStock) => onStoreChange({ ...store, stock: [item, ...store.stock] }), [onStoreChange, store]);
  const addProduction = useCallback((item: DemoProduction) => onStoreChange({ ...store, production: [item, ...store.production] }), [onStoreChange, store]);

  const totalIncome = store.transactions.filter((t) => t.positive).reduce((s, t) => s + t.value, 0);
  const totalExpense = store.transactions.filter((t) => !t.positive).reduce((s, t) => s + t.value, 0);

  return (
    <section className="bg-[var(--surface)] px-4 py-14 sm:px-8 sm:py-20" data-marketing-section="produto" data-section-label="Produto">
      <div className="mx-auto max-w-6xl">
        <div className="reveal-on-scroll mx-auto mb-8 max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            <PawPrint className="h-3.5 w-3.5" /> Sistema interativo
          </span>
          <h2 className="mt-4 text-2xl font-semibold sm:text-3xl">Clique, adicione e explore o Rancho por dentro.</h2>
          <p className="mt-3 text-base text-[var(--text-2)]">Interaja com os módulos reais do sistema. Adicione animais, registre transações e veja tudo se conectar.</p>
        </div>

        <div className="reveal-on-scroll overflow-hidden rounded-xl border border-[#E2E4EA] shadow-[0_18px_50px_rgba(15,26,20,0.10)] dark:border-[#2D3039]">
          {/* Mobile tabs */}
          <div className="flex gap-1 overflow-x-auto border-b border-[#E2E4EA] bg-[#141C17] p-1.5 sm:hidden [scrollbar-width:none]">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActive(tab.key)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-[11px] font-semibold transition ${
                    active === tab.key ? "bg-[#16803C] text-white" : "text-[#A3B0A7] hover:bg-white/10"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />{tab.label}
                </button>
              );
            })}
          </div>

          {/* Desktop layout */}
          <div className="flex min-h-[420px] sm:min-h-[470px]">
            <Sidebar active={active} onNavigate={setActive} />
            <div className="min-w-0 flex-1 bg-[#F3F4F6]">
              <ShowcaseHeader tab={active} />
              {active === "dashboard" ? <DashboardView animalCount={store.animals.length} totalIncome={totalIncome} totalExpense={totalExpense} stock={store.stock} production={store.production} /> : null}
              {active === "rebanho" ? <RebanhoView animals={store.animals} onAdd={addAnimal} onRemove={removeAnimal} /> : null}
              {active === "producao" ? <ProductionView production={store.production} onAdd={addProduction} /> : null}
              {active === "financeiro" ? <FinanceiroView transactions={store.transactions} onAdd={addTransaction} onRemove={removeTransaction} /> : null}
              {active === "estoque" ? <EstoqueView stock={store.stock} onAdd={addStock} /> : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
