"use client";

import {
  ArrowRight,
  BarChart3,
  Bot,
  Boxes,
  CheckCircle2,
  ChevronRight,
  Droplets,
  Filter,
  Leaf,
  MessageCircle,
  PawPrint,
  Search,
  Send,
  TrendingUp,
  Wallet,
  X
} from "lucide-react";
import { useMemo, useState } from "react";
import Link from "next/link";

type ShowcaseKey = "dashboard" | "rebanho" | "producao" | "financeiro" | "whatsapp";

type ShowcaseTab = {
  key: ShowcaseKey;
  label: string;
  icon: typeof BarChart3;
};

const showcaseTabs: ShowcaseTab[] = [
  { key: "dashboard", label: "Painel", icon: BarChart3 },
  { key: "rebanho", label: "Rebanho", icon: PawPrint },
  { key: "producao", label: "Produção", icon: Droplets },
  { key: "financeiro", label: "Financeiro", icon: Wallet },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle }
];

const animals = [
  { name: "Mimosa", code: "B-001", category: "Vaca", phase: "Lactação", status: "Ativo" },
  { name: "Branquinha", code: "V-403", category: "Vaca", phase: "Pré-parto", status: "Ativo" },
  { name: "Touro T-07", code: "T-007", category: "Touro", phase: "Reprodução", status: "Ativo" },
  { name: "Aurora", code: "C-396", category: "Bezerra", phase: "Crescimento", status: "Ativo" }
];

const transactions = [
  { label: "Venda de leite", date: "Hoje", value: "R$ 1.280,00", positive: true },
  { label: "Compra de ração", date: "Ontem", value: "R$ 960,00", positive: false },
  { label: "Vacina clostridial", date: "28/07", value: "R$ 180,00", positive: false }
];

const botExamples = [
  { label: "Produção", text: "Mimosa deu 28 litros hoje", answer: "Registrei 28 litros para Mimosa e atualizei a produção de hoje." },
  { label: "Estoque", text: "Comprei 12 sacos de ração por 960 reais", answer: "Encontrei a ração no estoque. Posso registrar a entrada de 12 sacos e a despesa de R$ 960,00." },
  { label: "Reprodução", text: "A vaca B-001 pariu uma bezerra hoje", answer: "Identifiquei o parto da B-001. Posso cadastrar a cria e vincular a genealogia após sua confirmação." }
];

function MiniSidebar({ active }: { active: ShowcaseKey }) {
  return (
    <aside className="hidden w-36 shrink-0 border-r border-slate-200 bg-white p-3 sm:block">
      <div className="flex items-center gap-1.5 px-1 pb-5 text-[11px] font-bold text-slate-800">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-700 text-white"><Leaf className="h-3.5 w-3.5" /></span>
        Rancho
      </div>
      <div className="space-y-1 text-[10px] font-semibold text-slate-500">
        {[
          ["dashboard", "Dashboard"],
          ["rebanho", "Rebanho"],
          ["producao", "Produção"],
          ["financeiro", "Financeiro"],
          ["whatsapp", "WhatsApp"]
        ].map(([key, label]) => (
          <div key={key} className={`rounded-md px-2 py-2 ${active === key ? "bg-emerald-50 text-emerald-800" : ""}`}>
            {label}
          </div>
        ))}
      </div>
    </aside>
  );
}

function PreviewHeader() {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2.5 sm:px-4">
      <div className="flex min-w-0 items-center gap-2 text-[10px] font-semibold text-slate-800 sm:text-[11px]">
        <span className="sm:hidden flex h-6 w-6 items-center justify-center rounded-md bg-emerald-700 text-white"><Leaf className="h-3.5 w-3.5" /></span>
        <span className="truncate">Visão geral da fazenda</span>
      </div>
      <div className="flex items-center gap-2 text-slate-400"><Search className="h-3.5 w-3.5" /><span className="hidden text-[10px] sm:inline">Administrador</span><span className="h-5 w-5 rounded-full bg-emerald-100" /></div>
    </div>
  );
}

function Metric({ label, value, helper, tone = "green" }: { label: string; value: string; helper: string; tone?: "green" | "blue" | "amber" | "slate" }) {
  const colors = {
    green: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-700"
  };
  return <div className="rounded-lg border border-slate-200 bg-white p-3"><p className="text-[10px] font-semibold text-slate-500">{label}</p><p className="mt-2 text-base font-bold text-slate-900 sm:text-lg">{value}</p><span className={`mt-2 inline-flex rounded px-1.5 py-0.5 text-[9px] font-semibold ${colors[tone]}`}>{helper}</span></div>;
}

function DashboardPreview() {
  return <div className="space-y-3 p-3 sm:p-5">
    <div className="rounded-lg bg-[#0f1a14] p-4 text-white sm:p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-300">Resumo da fazenda</p><h3 className="mt-2 text-base font-semibold sm:text-xl">Tudo em um só lugar.</h3><p className="mt-1 max-w-md text-[10px] leading-relaxed text-slate-300 sm:text-xs">Acompanhe os números mais importantes da rotina sem abrir várias planilhas.</p></div><TrendingUp className="h-5 w-5 shrink-0 text-emerald-300" /></div></div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Metric label="Animais ativos" value="42" helper="+3 este mês" /><Metric label="Produção hoje" value="286 L" helper="+8,4%" tone="blue" /><Metric label="Saldo do mês" value="R$ 4.280" helper="Atualizado hoje" tone="green" /><Metric label="Alertas" value="3" helper="Ver agora" tone="amber" /></div>
    <div className="grid gap-3 sm:grid-cols-[1.3fr_0.7fr]"><div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4"><div className="flex items-center justify-between"><p className="text-[11px] font-bold text-slate-800">Produção por dia</p><span className="text-[9px] text-slate-400">Últimos 7 dias</span></div><div className="mt-5 flex h-24 items-end gap-2">{[42, 58, 49, 68, 57, 78, 91].map((height, index) => <div key={index} className="flex flex-1 flex-col items-center gap-1"><div className="w-full rounded-t bg-emerald-400" style={{ height: `${height}%` }} /><span className="text-[8px] text-slate-400">{index + 1}</span></div>)}</div></div><div className="rounded-lg border border-amber-200 bg-amber-50 p-3 sm:p-4"><p className="text-[11px] font-bold text-amber-900">Atenção</p><p className="mt-2 text-[10px] leading-relaxed text-amber-800">3 itens do estoque estão próximos do mínimo.</p><button type="button" className="mt-4 inline-flex items-center gap-1 text-[10px] font-bold text-amber-900">Ver estoque <ChevronRight className="h-3 w-3" /></button></div></div>
  </div>;
}

function HerdPreview() {
  return <div className="p-3 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold text-slate-900 sm:text-base">Rebanho</p><p className="mt-1 text-[10px] text-slate-500">42 animais ativos cadastrados</p></div><div className="flex items-center gap-2"><button type="button" className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1.5 text-[10px] font-semibold text-slate-600"><Filter className="h-3 w-3" /> Filtrar</button><button type="button" className="rounded-md bg-emerald-700 px-2.5 py-1.5 text-[10px] font-semibold text-white">Adicionar</button></div></div><div className="mt-4 flex gap-2 overflow-x-auto pb-1 text-[10px] font-semibold"><span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">Todos · 42</span><span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-slate-500">Vacas · 18</span><span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-slate-500">Touros · 4</span></div><div className="mt-3 overflow-hidden rounded-lg border border-slate-200"><div className="grid grid-cols-[1.2fr_0.8fr_0.8fr] gap-2 bg-slate-50 px-3 py-2 text-[9px] font-bold uppercase tracking-wide text-slate-400"><span>Animal</span><span>Categoria</span><span>Fase</span></div>{animals.map((animal) => <div key={animal.code} className="grid grid-cols-[1.2fr_0.8fr_0.8fr] items-center gap-2 border-t border-slate-100 px-3 py-2.5 text-[10px] text-slate-600"><div><p className="font-semibold text-slate-800">{animal.name}</p><p className="text-[9px] text-slate-400">{animal.code}</p></div><span>{animal.category}</span><span className="flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{animal.phase}</span></div>)}</div></div>;
}

function ProductionPreview() {
  return <div className="space-y-3 p-3 sm:p-5"><div className="flex items-center justify-between"><div><p className="text-sm font-bold text-slate-900 sm:text-base">Produção de leite</p><p className="mt-1 text-[10px] text-slate-500">Acompanhe volume e desempenho por animal.</p></div><button type="button" className="rounded-md border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600">Período: mês</button></div><div className="grid grid-cols-3 gap-2"><Metric label="Total" value="6.842 L" helper="Este mês" tone="blue" /><Metric label="Média diária" value="228 L" helper="30 dias" /><Metric label="Melhor animal" value="Mimosa" helper="32 L hoje" tone="amber" /></div><div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4"><div className="flex items-center justify-between"><p className="text-[11px] font-bold text-slate-800">Produção por animal</p><BarChart3 className="h-4 w-4 text-blue-600" /></div><div className="mt-4 space-y-3">{[["Mimosa (B-001)", "92%", "32 L"], ["Branquinha (V-403)", "76%", "26 L"], ["Luna (N-401)", "64%", "22 L"]].map(([name, width, value]) => <div key={name}><div className="flex justify-between text-[10px] font-semibold text-slate-600"><span>{name}</span><span>{value}</span></div><div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{ width }} /></div></div>)}</div></div></div>;
}

function FinancePreview() {
  return <div className="space-y-3 p-3 sm:p-5"><div className="flex items-center justify-between"><div><p className="text-sm font-bold text-slate-900 sm:text-base">Financeiro</p><p className="mt-1 text-[10px] text-slate-500">Receitas, despesas e resultado do período.</p></div><button type="button" className="rounded-md border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600">Julho de 2026</button></div><div className="grid grid-cols-3 gap-2"><Metric label="Entradas" value="R$ 8.420" helper="12 registros" /><Metric label="Saídas" value="R$ 4.140" helper="18 registros" tone="amber" /><Metric label="Resultado" value="R$ 4.280" helper="+12,2%" tone="blue" /></div><div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4"><div className="flex items-center justify-between"><p className="text-[11px] font-bold text-slate-800">Movimentações recentes</p><button type="button" className="text-[10px] font-semibold text-emerald-700">Ver tudo</button></div><div className="mt-2 divide-y divide-slate-100">{transactions.map((transaction) => <div key={transaction.label} className="flex items-center justify-between gap-3 py-2.5 text-[10px]"><div><p className="font-semibold text-slate-700">{transaction.label}</p><p className="text-[9px] text-slate-400">{transaction.date}</p></div><span className={`font-bold ${transaction.positive ? "text-emerald-700" : "text-slate-700"}`}>{transaction.positive ? "+" : "-"}{transaction.value}</span></div>)}</div></div></div>;
}

function WhatsAppPreview() {
  return <div className="flex min-h-[315px] flex-col bg-[#efeae2] p-3 sm:min-h-[360px] sm:p-5"><div className="flex items-center gap-2 rounded-t-lg bg-[#075e54] px-3 py-2 text-white"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-200 text-emerald-900"><Bot className="h-3.5 w-3.5" /></span><div><p className="text-[10px] font-bold">Rancho</p><p className="text-[8px] text-emerald-100">bot de gestão</p></div></div><div className="flex flex-1 flex-col justify-end gap-2 rounded-b-lg bg-[#e5ddd5] p-3"><div className="max-w-[82%] self-end rounded-lg rounded-tr-sm bg-[#d9fdd3] px-3 py-2 text-[10px] text-slate-700 shadow-sm">Mimosa deu 28 litros hoje <span className="ml-1 text-[8px] text-slate-400">08:41 ✓✓</span></div><div className="max-w-[85%] rounded-lg rounded-tl-sm bg-white px-3 py-2 text-[10px] text-slate-700 shadow-sm"><p>Entendi: registrar 28 litros para Mimosa hoje.</p><p className="mt-1 font-semibold text-emerald-800">1 - Confirmar &nbsp; 2 - Corrigir</p><span className="mt-1 block text-[8px] text-slate-400">08:41</span></div><div className="flex items-center gap-2 rounded-md bg-white/80 px-3 py-2 text-[9px] text-slate-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Mensagem confirmada antes de salvar</div></div></div>;
}

function PreviewContent({ active }: { active: ShowcaseKey }) {
  if (active === "rebanho") return <HerdPreview />;
  if (active === "producao") return <ProductionPreview />;
  if (active === "financeiro") return <FinancePreview />;
  if (active === "whatsapp") return <WhatsAppPreview />;
  return <DashboardPreview />;
}

export function InteractiveProductShowcase() {
  const [active, setActive] = useState<ShowcaseKey>("dashboard");
  const currentTab = showcaseTabs.find((tab) => tab.key === active) || showcaseTabs[0];

  return <section className="bg-[var(--surface)] px-5 py-16 sm:px-8 sm:py-20" data-marketing-section="produto" data-section-label="Produto">
    <div className="mx-auto max-w-6xl">
      <div className="reveal-on-scroll mx-auto max-w-2xl text-center"><span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /> Produto em movimento</span><h2 className="mt-4 text-2xl font-semibold sm:text-3xl">Clique e explore o Rancho por dentro.</h2><p className="mt-3 text-base leading-relaxed text-[var(--text-2)]">Uma visão rápida do painel atualizado, com os dados organizados para a rotina da fazenda.</p></div>
      <div className="reveal-on-scroll mt-10 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-[0_18px_50px_rgba(15,26,20,0.12)]">
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white p-2 [scrollbar-width:none]">{showcaseTabs.map((tab) => { const Icon = tab.icon; return <button key={tab.key} type="button" onClick={() => setActive(tab.key)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-[11px] font-semibold transition sm:px-4 ${active === tab.key ? "bg-emerald-700 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`} aria-pressed={active === tab.key}><Icon className="h-3.5 w-3.5" />{tab.label}</button>; })}</div>
        <div className="flex min-h-[390px] sm:min-h-[455px]"><MiniSidebar active={active} /><div className="min-w-0 flex-1"><PreviewHeader /><div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-[10px] text-slate-500 sm:px-5"><span className="font-semibold text-slate-800">{currentTab.label}</span> <span className="mx-1">·</span> dados demonstrativos do novo painel</div><PreviewContent active={active} /></div></div>
      </div>
    </div>
  </section>;
}

export function BotLandingDemo() {
  const [messages, setMessages] = useState<{ role: "user" | "bot"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [uses, setUses] = useState(3);
  const [busy, setBusy] = useState(false);

  const suggested = useMemo(() => botExamples.filter((example) => !messages.some((message) => message.role === "user" && message.text === example.text)), [messages]);

  function sendMessage(value = input) {
    const text = value.trim();
    if (!text || uses <= 0 || busy) return;
    const example = botExamples.find((item) => item.text === text);
    const answer = example?.answer || "Posso ajudar com rebanho, produção, estoque e financeiro. Experimente uma das mensagens sugeridas.";
    setInput("");
    setUses((current) => current - 1);
    setMessages((current) => [...current, { role: "user", text }, { role: "bot", text: answer }]);
    setBusy(true);
    window.setTimeout(() => setBusy(false), 420);
  }

  return <section className="bg-[#0f1a14] px-5 py-16 text-white sm:px-8 sm:py-20" data-marketing-section="demo-bot" data-section-label="Demo do bot">
    <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center"><div className="reveal-on-scroll"><span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300"><Bot className="h-3.5 w-3.5" /> Teste rápido</span><h2 className="mt-4 text-2xl font-semibold sm:text-3xl">Veja como o bot conversa com a equipe.</h2><p className="mt-4 max-w-md text-base leading-relaxed text-slate-300">Use até três mensagens para experimentar respostas do Rancho. Esta demonstração usa dados fictícios e não salva nada.</p><div className="mt-6 flex items-center gap-3 text-sm text-slate-300"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300"><MessageCircle className="h-4 w-4" /></span><span><strong className="text-white">{uses} {uses === 1 ? "teste restante" : "testes restantes"}</strong><br /><span className="text-xs text-slate-400">Sem cadastro para começar</span></span></div></div>
      <div className="reveal-on-scroll overflow-hidden rounded-xl border border-white/10 bg-[#202c29] shadow-2xl shadow-black/30"><div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white"><Bot className="h-4 w-4" /></span><div><p className="text-sm font-semibold">Rancho Bot</p><p className="text-[10px] text-emerald-300">Demonstração protegida</p></div></div><span className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-slate-400">{uses}/3</span></div><div className="min-h-[250px] space-y-3 bg-[#17211f] p-4 sm:min-h-[280px]">{messages.length === 0 ? <div className="flex h-56 flex-col items-center justify-center text-center text-slate-400"><Bot className="h-8 w-8 text-emerald-400/70" /><p className="mt-3 text-sm">Escolha uma mensagem para começar.</p></div> : messages.map((message, index) => <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[86%] rounded-lg px-3 py-2 text-xs leading-relaxed ${message.role === "user" ? "rounded-tr-sm bg-emerald-700 text-white" : "rounded-tl-sm bg-white/10 text-slate-200"}`}>{message.text}</div></div>)}{busy ? <div className="flex justify-start"><div className="rounded-lg rounded-tl-sm bg-white/10 px-3 py-2 text-xs text-slate-400">Consultando demonstração...</div></div> : null}</div><div className="border-t border-white/10 bg-[#202c29] p-3"><div className="mb-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">{suggested.map((example) => <button key={example.text} type="button" onClick={() => sendMessage(example.text)} disabled={uses <= 0 || busy} className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50">{example.label}</button>)}</div><form onSubmit={(event) => { event.preventDefault(); sendMessage(); }} className="flex items-center gap-2"><input value={input} onChange={(event) => setInput(event.target.value)} disabled={uses <= 0 || busy} placeholder={uses > 0 ? "Escreva uma mensagem..." : "Demonstração encerrada"} className="min-w-0 flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-60" /><button type="submit" aria-label="Enviar mensagem" disabled={!input.trim() || uses <= 0 || busy} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"><Send className="h-3.5 w-3.5" /></button></form>{uses === 0 ? <div className="mt-3 flex items-center justify-between gap-3 text-[10px] text-slate-400"><span>Quer continuar conhecendo o sistema?</span><Link href="/login" className="inline-flex items-center gap-1 font-semibold text-emerald-300">Entrar <ArrowRight className="h-3 w-3" /></Link><button type="button" aria-label="Limpar demonstração" onClick={() => { setMessages([]); setUses(3); }} className="text-slate-500 transition hover:text-white"><X className="h-3.5 w-3.5" /></button></div> : <p className="mt-2 text-[10px] text-slate-500">Respostas demonstrativas · nenhuma informação real será alterada.</p>}</div></div>
    </div>
  </section>;
}
