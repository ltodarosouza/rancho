import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Boxes,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Droplets,
  GitFork,
  Leaf,
  LogIn,
  Mail,
  MessageCircle,
  PawPrint,
  ShieldCheck,
  UsersRound,
  Wallet,
  ZoomIn,
  type LucideIcon
} from "lucide-react";
import {
  CONTACT_HREF,
  founders,
  homeExamples,
  homeFaq,
  marketingStructuredData,
  solutionPages,
  SUPPORT_EMAIL,
  type MarketingFeature,
  type MarketingIcon,
  type MarketingPageContent,
  type MarketingScreenshot
} from "@/lib/marketing-content";
import { MarketingEffects } from "./MarketingEffects";
import { BotLandingDemo, InteractiveProductShowcase } from "./InteractiveShowcase";

const iconMap: Record<MarketingIcon, LucideIcon> = {
  "bar-chart": BarChart3,
  bot: Bot,
  boxes: Boxes,
  clipboard: ClipboardCheck,
  droplets: Droplets,
  "git-fork": GitFork,
  leaf: Leaf,
  message: MessageCircle,
  paw: PawPrint,
  shield: ShieldCheck,
  users: UsersRound,
  wallet: Wallet
};

function StructuredData({ page }: { page?: MarketingPageContent }) {
  return (
    <>
      {marketingStructuredData(page).map((item, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }} />
      ))}
    </>
  );
}

function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
      <div className="marketing-scroll-progress" aria-hidden="true" />
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 text-[var(--text)]" aria-label="Rancho">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Leaf className="h-4.5 w-4.5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Rancho</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/login" className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--bg)]">
            <LogIn className="h-3.5 w-3.5" />
            Entrar
          </Link>
          <a href={CONTACT_HREF} className="hidden h-9 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-600 sm:inline-flex">
            Solicitar demonstração
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </nav>
    </header>
  );
}

function NavLight({ currentSlug }: { currentSlug?: string }) {
  const navItems = [
    { label: "Software", href: "/software-para-fazenda", slug: "software-para-fazenda" },
    { label: "Rebanho", href: "/controle-de-rebanho", slug: "controle-de-rebanho" },
    { label: "Produção", href: "/controle-leiteiro", slug: "controle-leiteiro" },
    { label: "WhatsApp", href: "/bot-whatsapp-fazenda", slug: "bot-whatsapp-fazenda" },
    { label: "Financeiro", href: "/financeiro-rural", slug: "financeiro-rural" }
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
      <div className="marketing-scroll-progress" aria-hidden="true" />
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 text-[var(--text)]" aria-label="Rancho">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Leaf className="h-4.5 w-4.5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Rancho</span>
        </Link>
        <div className="flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.slug}
              href={item.href}
              className={`marketing-nav-link hidden rounded-md px-2.5 py-1.5 text-sm font-medium transition sm:inline-block ${currentSlug === item.slug ? "marketing-nav-link-active text-emerald-700 dark:text-emerald-400" : "text-[var(--text-2)] hover:text-[var(--text)]"}`}
              aria-current={currentSlug === item.slug ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/login" className="ml-2 inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--bg)]">
            <LogIn className="h-3.5 w-3.5" />
            Entrar
          </Link>
        </div>
      </nav>
    </header>
  );
}

function ScreenshotCard({ item, large = false }: { item: MarketingScreenshot; large?: boolean }) {
  return (
    <article className={`marketing-spotlight reveal-on-scroll group overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-[var(--text-3)] ${large ? "lg:col-span-2" : ""}`}>
      <div className="relative overflow-x-auto bg-[var(--surface)] [scrollbar-width:thin]">
        <Image
          src={item.image}
          alt={`Tela do Rancho: ${item.name}`}
          width={2160}
          height={1350}
          unoptimized
          loading={large ? "eager" : "lazy"}
          decoding="async"
          sizes={large ? "(min-width: 1024px) 100vw, 100vw" : "(min-width: 1024px) 50vw, 100vw"}
          className="h-auto w-[760px] max-w-none object-top sm:w-full"
        />
        {item.mask === "settings" ? (
          <>
            <div className="absolute left-[60%] top-[32%] h-[15%] w-[31%] rounded-lg border border-[var(--border)] bg-[var(--surface)]/85" />
            <div className="absolute left-[60%] top-[64%] h-[19%] w-[31%] rounded-lg border border-[var(--border)] bg-[var(--surface)]/85" />
          </>
        ) : null}
        <button
          type="button"
          data-screenshot-open
          data-screenshot-src={item.image}
          data-screenshot-title={item.name}
          data-screenshot-detail={item.detail}
          className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)]/90 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 transition hover:bg-[var(--surface)] dark:text-emerald-400 sm:hidden"
        >
          <ZoomIn className="h-3.5 w-3.5" />
          Ampliar
        </button>
      </div>
      <div className="border-t border-[var(--border)] px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-3)]">{item.detail}</p>
        <h3 className="mt-0.5 font-semibold text-[var(--text)]">{item.name}</h3>
      </div>
    </article>
  );
}

function FeatureCard({ item }: { item: MarketingFeature }) {
  const Icon = iconMap[item.icon];
  return (
    <article className="marketing-spotlight reveal-on-scroll group rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-[var(--text-3)]">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-700 group-hover:text-white dark:bg-emerald-950/40 dark:text-emerald-400 dark:group-hover:bg-emerald-700 dark:group-hover:text-white">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-semibold text-[var(--text)]">{item.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-2)]">{item.description}</p>
    </article>
  );
}

function FaqBlock({ faq }: { faq: { question: string; answer: string }[] }) {
  return (
    <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      {faq.map((item) => (
        <article key={item.question} className="reveal-on-scroll p-5">
          <h3 className="font-semibold text-[var(--text)]">{item.question}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-2)]">{item.answer}</p>
        </article>
      ))}
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)] px-5 py-10 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/" className="inline-flex items-center gap-2.5 font-semibold text-[var(--text)]">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-800 text-white">
              <Leaf className="h-4 w-4" />
            </span>
            Rancho
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-[var(--text-2)]">
            Gestão agropecuária feita em João Pessoa/PB por {founders.join(" e ")}.
          </p>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-2 inline-block text-sm font-medium text-emerald-700 dark:text-emerald-400">{SUPPORT_EMAIL}</a>
        </div>
        <div className="grid gap-x-10 gap-y-3 text-sm sm:grid-cols-2">
          {solutionPages.map((page) => (
            <Link key={page.slug} href={`/${page.slug}`} className="font-medium text-[var(--text-2)] transition hover:text-emerald-700 dark:hover:text-emerald-400">
              {page.heroLabel}
            </Link>
          ))}
          <Link href="/login" className="font-medium text-[var(--text-2)] transition hover:text-emerald-700 dark:hover:text-emerald-400">
            Entrar no sistema
          </Link>
        </div>
      </div>
    </footer>
  );
}

/* ─── HOME PAGE ─── */

const whatsappExamples = [
  { msg: "B-002 deu 32 litros hoje", tag: "Produção" },
  { msg: "vendi 4 sacos de milho por 320 reais", tag: "Financeiro" },
  { msg: "a vaca B-5 pariu uma bezerra hoje", tag: "Reprodução" },
  { msg: "apliquei vacina clostridial na B-001", tag: "Saúde" },
];

const modules = [
  { icon: "paw" as MarketingIcon, name: "Rebanho", desc: "Animais, lotes, fases e ficha individual" },
  { icon: "droplets" as MarketingIcon, name: "Produção", desc: "Ordenhas, litros e destino do leite" },
  { icon: "boxes" as MarketingIcon, name: "Estoque", desc: "Entradas, baixas e saldo de insumos" },
  { icon: "wallet" as MarketingIcon, name: "Financeiro", desc: "Receitas, despesas e fluxo de caixa" },
  { icon: "git-fork" as MarketingIcon, name: "Genealogia", desc: "Partos, crias e árvore familiar" },
  { icon: "users" as MarketingIcon, name: "Equipe", desc: "Funcionários, ponto e acessos" },
];

export function MarketingHomePage() {
  return (
    <>
      <StructuredData />
      <main className="min-h-screen text-[var(--text)]">
        <MarketingEffects />
        <Nav />

        {/* ── Hero ── */}
        <section className="relative overflow-hidden bg-[#0f1a14] pb-0 pt-24 text-white sm:pt-28" data-marketing-section="inicio" data-section-label="Início">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(16,185,129,0.15),transparent)]" />
          <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-1.5 text-sm font-medium text-emerald-300">
                <Bot className="h-4 w-4" />
                Software com bot de WhatsApp integrado
              </div>
              <h1 className="text-3xl font-semibold leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl">
                Gestão da fazenda
                <br />
                <span className="text-emerald-400">do rebanho ao financeiro.</span>
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-gray-300 sm:text-lg">
                Rebanho, produção de leite, estoque, financeiro e equipe em um sistema feito pra rotina da fazenda — com registro pelo WhatsApp pra quem está no campo.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a href={CONTACT_HREF} className="inline-flex h-12 items-center gap-2 rounded-lg bg-emerald-600 px-6 text-base font-semibold text-white transition hover:bg-emerald-500">
                  Solicitar demonstração
                  <ArrowRight className="h-4 w-4" />
                </a>
                <Link href="/login" className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/15 px-6 text-base font-medium text-white/90 transition hover:bg-white/5">
                  <LogIn className="h-4 w-4" />
                  Entrar no sistema
                </Link>
              </div>
            </div>

            <div className="pb-10 sm:pb-14" />
          </div>
        </section>

        {/* ── Trust strip ── */}
        <section className="border-b border-[var(--border)] bg-[var(--surface)] px-5 py-3 sm:px-8">
          <p className="mx-auto max-w-6xl text-center text-xs text-[var(--text-3)]">
            Feito por {founders.join(" e ")} · João Pessoa, Paraíba · <a href={`mailto:${SUPPORT_EMAIL}`} className="text-emerald-700 hover:underline dark:text-emerald-400">{SUPPORT_EMAIL}</a>
          </p>
        </section>

        {/* ── O problema → solução ── */}
        <section className="bg-[var(--bg)] px-5 py-16 sm:px-8 sm:py-20" data-marketing-section="problema" data-section-label="Por que existe">
          <div className="reveal-on-scroll mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold sm:text-3xl">
                Caderno perde. Planilha atrasa.
                <br className="hidden sm:block" />
                {" "}Conversa no WhatsApp some.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[var(--text-2)]">
                A informação da fazenda fica espalhada e o gestor só descobre o que aconteceu quando já é tarde. O Rancho resolve isso conectando o registro do campo ao painel da gestão.
              </p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {[
                { num: "1", title: "A equipe manda mensagem", desc: "Pelo WhatsApp, como já faz hoje. Sem app novo, sem treinamento." },
                { num: "2", title: "O Rancho organiza", desc: "O bot entende a mensagem, confirma com o funcionário e registra no módulo certo." },
                { num: "3", title: "Você acompanha", desc: "Rebanho, produção, estoque e financeiro atualizados no painel, de qualquer lugar." },
              ].map((step) => (
                <div key={step.num} className="reveal-on-scroll rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-700 text-sm font-semibold text-white">{step.num}</div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-2)]">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── WhatsApp: o diferencial ── */}
        <section className="bg-[#0f1a14] px-5 py-16 text-white sm:px-8 sm:py-20" data-marketing-section="whatsapp" data-section-label="WhatsApp">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center">
            <div className="reveal-on-scroll">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
                <MessageCircle className="h-3.5 w-3.5" />
                Diferencial
              </div>
              <h2 className="text-2xl font-semibold sm:text-3xl">A equipe registra como já conversa.</h2>
              <p className="mt-4 text-base leading-relaxed text-gray-300">
                Ninguém precisa aprender um sistema novo. O funcionário manda uma mensagem simples no WhatsApp e o Rancho transforma em registro organizado — produção, estoque, financeiro, tudo no lugar certo.
              </p>
              <div className="mt-8 space-y-3">
                {whatsappExamples.map((ex) => (
                  <div key={ex.msg} className="reveal-on-scroll flex items-start gap-3 rounded-lg border border-white/8 bg-white/5 p-3">
                    <span className="mt-0.5 shrink-0 rounded bg-emerald-600/30 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">{ex.tag}</span>
                    <p className="text-sm text-gray-200">&ldquo;{ex.msg}&rdquo;</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="reveal-on-scroll rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-black/30 sm:p-6">
              <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Rancho</p>
                    <p className="text-xs text-gray-400">Bot de gestão no WhatsApp</p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-xs text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> online
                </span>
              </div>
              <div className="space-y-3 text-sm">
                <div className="ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-emerald-600 px-4 py-3 text-white">
                  A vaca Mimosa produziu 19,7 litros hoje.
                </div>
                <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-white/10 px-4 py-3 text-gray-200">
                  Entendi. Vou registrar a produção de leite da Mimosa. Está correto?
                  <div className="mt-2 text-xs font-semibold text-emerald-300">1 - Confirmar &nbsp; 2 - Corrigir</div>
                </div>
                <div className="flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-gray-400">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  A ação só é salva depois da confirmação.
                </div>
              </div>
            </div>
          </div>
        </section>

        <BotLandingDemo />

        {/* ── Módulos ── */}
        <section className="bg-[var(--bg)] px-5 py-16 sm:px-8 sm:py-20" data-marketing-section="modulos" data-section-label="Módulos">
          <div className="mx-auto max-w-6xl">
            <div className="reveal-on-scroll mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold sm:text-3xl">Tudo que a fazenda precisa, conectado.</h2>
              <p className="mt-3 text-base text-[var(--text-2)]">
                Cada módulo conversa com os outros. Uma venda atualiza o estoque e o financeiro. Um parto cria a cria e atualiza a genealogia.
              </p>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {modules.map((m) => {
                const Icon = iconMap[m.icon];
                return (
                  <div key={m.name} className="marketing-spotlight reveal-on-scroll flex items-start gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-[var(--text-3)]">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{m.name}</h3>
                      <p className="mt-1 text-sm text-[var(--text-2)]">{m.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <InteractiveProductShowcase />

        {/* ── Exemplos ── */}
        <section className="bg-[var(--bg)] px-5 py-16 sm:px-8 sm:py-20" data-marketing-section="exemplos" data-section-label="Exemplos">
          <div className="mx-auto max-w-6xl">
            <div className="reveal-on-scroll mx-auto mb-10 max-w-2xl text-center">
              <h2 className="text-2xl font-semibold sm:text-3xl">Mensagem simples, registro completo.</h2>
              <p className="mt-3 text-base text-[var(--text-2)]">
                O funcionário escreve como fala. O Rancho entende, confirma e salva no módulo certo.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {homeExamples.slice(0, 4).map((ex) => (
                <div key={ex.text} className="marketing-spotlight reveal-on-scroll rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">{ex.area}</span>
                  <p className="mt-3 rounded-lg bg-gray-900 px-3 py-2.5 text-sm font-medium text-white dark:bg-gray-800">&ldquo;{ex.text}&rdquo;</p>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--text-2)]">{ex.result}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Soluções ── */}
        <section className="bg-[var(--surface)] px-5 py-16 sm:px-8 sm:py-20" data-marketing-section="solucoes" data-section-label="Soluções">
          <div className="mx-auto max-w-6xl">
            <h2 className="reveal-on-scroll text-center text-2xl font-semibold sm:text-3xl">Explore por área</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {solutionPages.slice(0, 6).map((page) => (
                <Link key={page.slug} href={`/${page.slug}`} className="marketing-spotlight reveal-on-scroll group rounded-xl border border-[var(--border)] bg-[var(--bg)] p-5 transition hover:border-[var(--text-3)]">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">{page.heroLabel}</span>
                  <h3 className="mt-2 font-semibold text-[var(--text)]">{page.heroTitle}</h3>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    Ver página <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="bg-[var(--bg)] px-5 py-16 sm:px-8 sm:py-20" data-marketing-section="faq" data-section-label="FAQ">
          <div className="mx-auto max-w-3xl">
            <h2 className="reveal-on-scroll mb-8 text-center text-2xl font-semibold sm:text-3xl">Perguntas frequentes</h2>
            <FaqBlock faq={homeFaq} />
          </div>
        </section>

        {/* ── CTA final ── */}
        <section className="px-5 py-16 sm:px-8 sm:py-20" data-marketing-section="contato" data-section-label="Contato">
          <div className="reveal-on-scroll mx-auto max-w-3xl rounded-2xl bg-[#0f1a14] p-8 text-center text-white sm:p-12">
            <h2 className="text-2xl font-semibold sm:text-3xl">Quer ver o Rancho na sua fazenda?</h2>
            <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-gray-300">
              Agende uma demonstração e veja como a rotina da fazenda fica mais simples de registrar e acompanhar.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a href={CONTACT_HREF} className="inline-flex h-12 items-center gap-2 rounded-lg bg-white px-6 font-semibold text-gray-900 transition hover:bg-emerald-50">
                Solicitar demonstração
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link href="/login" className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/15 px-6 font-medium text-white/90 transition hover:bg-white/5">
                Entrar no sistema
              </Link>
            </div>
            <p className="mt-5 text-sm text-gray-400">{SUPPORT_EMAIL}</p>
          </div>
        </section>

        <Footer />
      </main>
    </>
  );
}

/* ─── SOLUTION PAGE ─── */

function SolutionHero({
  label,
  title,
  text,
  image,
  imageAlt,
  primaryCta,
  proof
}: {
  label: string;
  title: string;
  text: string;
  image: string;
  imageAlt: string;
  primaryCta: string;
  proof: string[];
}) {
  return (
    <section className="relative isolate overflow-hidden bg-[#0f1a14] text-white" data-marketing-section="inicio" data-section-label="Início">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(16,185,129,0.12),transparent)]" />
      <div
        aria-label={imageAlt}
        role="img"
        className="marketing-hero-visual absolute inset-y-0 right-0 z-0 w-full bg-cover bg-top opacity-15 lg:w-[72%] lg:opacity-90"
        style={{ backgroundImage: `url(${image})` }}
      />
      <div className="absolute inset-0 z-0 bg-[linear-gradient(90deg,#0f1a14_0%,#0f1a14_68%,rgba(15,26,20,0.82)_100%)] lg:bg-[linear-gradient(90deg,#0f1a14_0%,#0f1a14_42%,rgba(15,26,20,0.88)_56%,rgba(15,26,20,0.35)_78%,rgba(15,26,20,0.08)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 z-0 h-48 bg-gradient-to-t from-[#0f1a14] via-[#0f1a14]/70 to-transparent" />
      <div className="relative z-10 mx-auto flex min-h-[60svh] max-w-6xl items-end px-5 pb-12 pt-24 sm:px-8 sm:pb-16 sm:pt-32">
        <div className="w-full max-w-2xl animate-fade-in">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-sm font-medium text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
            {label}
          </div>
          <h1 className="text-2xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">{title}</h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-300 sm:text-lg">{text}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a href={CONTACT_HREF} className="inline-flex h-12 items-center gap-2 rounded-lg bg-emerald-600 px-6 font-semibold text-white transition hover:bg-emerald-500">
              {primaryCta}
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link href="/login" className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/15 px-6 font-medium text-white/90 transition hover:bg-white/5">
              <LogIn className="h-4 w-4" />
              Entrar
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-3 text-sm font-medium text-gray-300">
            {proof.map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function MarketingSolutionPage({ page }: { page: MarketingPageContent }) {
  const relatedPages = page.related
    .map((slug) => solutionPages.find((item) => item.slug === slug))
    .filter(Boolean) as MarketingPageContent[];
  const visibleScreenshots = page.screenshots.length % 2 === 0
    ? page.screenshots
    : page.screenshots.slice(0, Math.max(2, page.screenshots.length - 1));

  return (
    <>
      <StructuredData page={page} />
      <main className="min-h-screen text-[var(--text)]">
        <NavLight currentSlug={page.slug} />
        <MarketingEffects />
        <SolutionHero
          label={page.heroLabel}
          title={page.heroTitle}
          text={page.heroText}
          image={page.heroImage}
          imageAlt={page.heroImageAlt}
          primaryCta={page.primaryCta}
          proof={page.proof}
        />

        {/* Intro + benefits */}
        <section className="bg-[var(--bg)] px-5 py-16 sm:px-8 sm:py-20" data-marketing-section="visao-geral" data-section-label="Visão geral">
          <div className="reveal-on-scroll mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <h2 className="text-2xl font-semibold sm:text-3xl">{page.introTitle}</h2>
              <p className="mt-4 text-base leading-relaxed text-[var(--text-2)]">{page.introText}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {page.benefits.map((b) => <FeatureCard key={b.title} item={b} />)}
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section className="bg-[var(--surface)] px-5 py-16 sm:px-8 sm:py-20" data-marketing-section="pratica" data-section-label="Na prática">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="reveal-on-scroll">
              <h2 className="text-2xl font-semibold sm:text-3xl">{page.workflowTitle}</h2>
              <p className="mt-3 text-base text-[var(--text-2)]">Fluxo simples para quem registra e para quem acompanha.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {page.workflow.map((step, i) => (
                <div key={step} className="reveal-on-scroll rounded-xl border border-[var(--border)] bg-[var(--bg)] p-5">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-sm font-semibold text-white">{i + 1}</div>
                  <p className="font-medium leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Screenshots */}
        <section className="bg-[var(--surface)] px-5 py-16 sm:px-8 sm:py-20" data-marketing-section="produto" data-section-label="Produto">
          <div className="mx-auto max-w-6xl">
            <h2 className="reveal-on-scroll text-2xl font-semibold sm:text-3xl">Telas reais do sistema</h2>
            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              {visibleScreenshots.map((item) => <ScreenshotCard key={item.name} item={item} />)}
            </div>
          </div>
        </section>

        {/* Examples */}
        {page.examples.length > 0 ? (
          <section className="bg-[var(--bg)] px-5 py-16 sm:px-8 sm:py-20">
            <div className="mx-auto max-w-6xl">
              <h2 className="reveal-on-scroll mb-8 text-2xl font-semibold sm:text-3xl">Exemplos de uso</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {page.examples.map((ex) => (
                  <div key={ex.text} className="reveal-on-scroll rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">{ex.area}</span>
                    <p className="mt-2 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white dark:bg-gray-800">&ldquo;{ex.text}&rdquo;</p>
                    <p className="mt-2 text-sm text-[var(--text-2)]">{ex.result}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* FAQ */}
        <section className="px-5 py-16 sm:px-8 sm:py-20" data-marketing-section="faq" data-section-label="FAQ">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.4fr_0.6fr]">
            <h2 className="reveal-on-scroll text-2xl font-semibold sm:text-3xl">Perguntas frequentes</h2>
            <FaqBlock faq={page.faq} />
          </div>
        </section>

        {/* Related */}
        <section className="bg-[#0f1a14] px-5 py-16 text-white sm:px-8 sm:py-20" data-marketing-section="relacionados" data-section-label="Relacionados">
          <div className="mx-auto max-w-6xl">
            <h2 className="reveal-on-scroll mb-8 text-2xl font-semibold">Também pode ajudar</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {relatedPages.map((rel) => (
                <Link key={rel.slug} href={`/${rel.slug}`} className="reveal-on-scroll group rounded-xl border border-white/10 bg-white/5 p-5 transition hover:border-emerald-400/30 hover:bg-white/8">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">{rel.heroLabel}</span>
                  <h3 className="mt-2 font-semibold">{rel.heroTitle}</h3>
                  <p className="mt-2 text-sm text-gray-400">{rel.description}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-300">
                    Ver solução <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-5 py-16 sm:px-8 sm:py-20" data-marketing-section="contato" data-section-label="Contato">
          <div className="reveal-on-scroll mx-auto max-w-3xl rounded-2xl bg-[#0f1a14] p-8 text-center text-white sm:p-12">
            <h2 className="text-2xl font-semibold sm:text-3xl">Quer usar o Rancho para {page.heroLabel.toLowerCase()}?</h2>
            <p className="mx-auto mt-4 max-w-lg text-base text-gray-300">
              Agende uma demonstração e veja essa rotina funcionando no sistema.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a href={CONTACT_HREF} className="inline-flex h-12 items-center gap-2 rounded-lg bg-white px-6 font-semibold text-gray-900 transition hover:bg-emerald-50">
                Solicitar demonstração <ArrowRight className="h-4 w-4" />
              </a>
              <Link href="/login" className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/15 px-6 font-medium text-white/90 transition hover:bg-white/5">
                Entrar no sistema
              </Link>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </>
  );
}
