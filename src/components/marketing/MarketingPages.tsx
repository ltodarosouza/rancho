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
  MapPin,
  MessageCircle,
  PawPrint,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Wallet,
  ZoomIn,
  type LucideIcon
} from "lucide-react";
import {
  CONTACT_HREF,
  companyLocation,
  founders,
  homeExamples,
  homeFaq,
  homeFeatures,
  marketingStructuredData,
  showcaseItems,
  solutionPages,
  SUPPORT_EMAIL,
  trustSignals,
  type MarketingFeature,
  type MarketingIcon,
  type MarketingPageContent,
  type MarketingScreenshot
} from "@/lib/marketing-content";
import { MarketingEffects } from "./MarketingEffects";

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

const homeScreenshots = [
  showcaseItems[0],
  showcaseItems[1],
  showcaseItems[3],
  showcaseItems[4],
  showcaseItems[5],
  showcaseItems[7]
];

const managementAreas = [
  "Controle de rebanho bovino",
  "Gestão de gado leiteiro",
  "Produção de leite e ordenha",
  "Controle de estoque rural",
  "Financeiro rural e fluxo de caixa",
  "Reprodução, partos e genealogia",
  "Vacinas, tratamentos e eventos",
  "Funcionários, ponto e folha"
];

const marketingNavItems = [
  { label: "Software", href: "/software-para-fazenda", slug: "software-para-fazenda" },
  { label: "Rebanho", href: "/controle-de-rebanho", slug: "controle-de-rebanho" },
  { label: "Produção", href: "/controle-leiteiro", slug: "controle-leiteiro" },
  { label: "WhatsApp", href: "/bot-whatsapp-fazenda", slug: "bot-whatsapp-fazenda" },
  { label: "Financeiro", href: "/financeiro-rural", slug: "financeiro-rural" }
];

function SectionLabel({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <p className={`mb-3 inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${dark ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
      <Leaf className="h-3.5 w-3.5" />
      {children}
    </p>
  );
}

function MarketingHeader({ currentSlug }: { currentSlug?: string }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-emerald-900/10 bg-white/95 shadow-sm shadow-slate-950/[0.04] backdrop-blur-xl">
      <div className="marketing-scroll-progress" aria-hidden="true" />
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 pt-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3 font-black text-slate-950" aria-label="Rancho">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-800 text-white shadow-lg shadow-emerald-900/20 sm:h-10 sm:w-10">
            <Leaf className="h-4 w-4 sm:h-5 sm:w-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-lg leading-tight">Rancho</span>
            <span className="block truncate text-xs font-bold text-slate-500">Gestão agropecuária</span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/login" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700">
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">Entrar</span>
          </Link>
          <a href={CONTACT_HREF} className="hidden h-10 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 text-sm font-black text-white shadow-lg shadow-emerald-800/20 transition hover:-translate-y-0.5 hover:bg-emerald-800 sm:inline-flex sm:px-4">
            <span className="hidden sm:inline">Solicitar demonstração</span>
            <span className="sm:hidden">Demo</span>
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </nav>
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-2 pb-2 pt-2 sm:px-6 sm:pt-3 lg:px-8">
        <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50/80 p-1 text-sm font-black text-slate-600 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-2 lg:inline-flex lg:flex-none">
          {marketingNavItems.map((item) => {
            const active = currentSlug === item.slug;
            return (
              <Link
                key={item.slug}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`marketing-nav-link whitespace-nowrap rounded-md px-2.5 py-1.5 transition sm:px-3 sm:py-2 ${active ? "marketing-nav-link-active bg-emerald-700 text-white shadow-sm shadow-emerald-900/15" : "hover:bg-white hover:text-emerald-800"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        <div className="marketing-section-indicator hidden shrink-0 items-center gap-2 rounded-lg border border-emerald-200 bg-white/80 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-emerald-800 shadow-sm xl:inline-flex">
          <Sparkles className="h-3.5 w-3.5" />
          <span data-section-indicator>Início</span>
        </div>
      </div>
    </header>
  );
}

function StructuredData({ page }: { page?: MarketingPageContent }) {
  return (
    <>
      {marketingStructuredData(page).map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}

function Hero({
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
    <section className="relative isolate overflow-hidden bg-slate-950 text-white" data-marketing-section="inicio" data-section-label="Início">
      <div className="absolute inset-0 z-0 bg-slate-950" />
      <div
        aria-label={imageAlt}
        role="img"
        className="marketing-hero-visual absolute inset-y-0 right-0 z-0 w-full bg-cover bg-top opacity-20 lg:w-[72%] lg:opacity-95"
        style={{ backgroundImage: `url(${image})` }}
      />
      <div className="absolute inset-0 z-0 bg-[linear-gradient(90deg,#020617_0%,#020617_68%,rgba(2,6,23,0.82)_100%)] lg:bg-[linear-gradient(90deg,#020617_0%,#020617_45%,rgba(2,6,23,0.86)_58%,rgba(2,6,23,0.32)_78%,rgba(2,6,23,0.08)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 z-0 h-48 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />
      <div className="relative z-10 mx-auto flex min-h-[68svh] max-w-7xl items-end px-4 pb-12 pt-28 sm:px-6 sm:pb-16 lg:px-8">
        <div className="w-full min-w-0 max-w-3xl animate-fade-in lg:max-w-[690px]">
          <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-emerald-300/30 bg-white/10 px-3 py-1 text-sm font-black text-emerald-100 shadow-sm backdrop-blur">
            <ShieldCheck className="h-4 w-4" />
            {label}
          </div>
          <h1 className="max-w-full break-words text-2xl font-black leading-tight tracking-normal sm:max-w-4xl sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-100 sm:mt-6 sm:text-lg sm:leading-8">
            {text}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={CONTACT_HREF} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-base font-black text-slate-950 shadow-xl shadow-emerald-950/30 transition hover:-translate-y-1 hover:bg-emerald-300">
              {primaryCta}
              <ArrowRight className="h-5 w-5" />
            </a>
            <Link href="/login" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/12 px-6 py-3 text-base font-black text-white backdrop-blur transition hover:-translate-y-1 hover:bg-white/20">
              Entrar no sistema
              <LogIn className="h-5 w-5" />
            </Link>
          </div>
          <div className="mt-8 grid max-w-2xl gap-3 text-sm font-bold text-slate-100 sm:grid-cols-3">
            {proof.map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 backdrop-blur">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  return (
    <section className="border-y border-emerald-900/10 bg-white">
      <div className="mx-auto grid max-w-7xl gap-3 px-4 py-4 text-sm font-bold text-slate-600 sm:px-6 md:grid-cols-3 lg:px-8">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-emerald-700" />
          {companyLocation}
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-700" />
          Feito por {founders.join(" e ")}
        </div>
        <a href={CONTACT_HREF} className="flex items-center gap-2 text-emerald-800 transition hover:text-emerald-950">
          <Mail className="h-4 w-4" />
          {SUPPORT_EMAIL}
        </a>
      </div>
    </section>
  );
}

function FeatureCard({ item }: { item: MarketingFeature }) {
  const Icon = iconMap[item.icon];
  return (
    <article className="marketing-spotlight reveal-on-scroll group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-soft">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 transition group-hover:bg-emerald-700 group-hover:text-white">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-black text-slate-950">{item.title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
    </article>
  );
}

function ScreenshotCard({ item, large = false }: { item: MarketingScreenshot; large?: boolean }) {
  return (
    <article className={`marketing-spotlight reveal-on-scroll group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-soft ${large ? "lg:col-span-2" : ""}`}>
      <div className="relative overflow-x-auto bg-white [scrollbar-width:thin]">
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
        <div className="absolute right-[2.5%] top-[2.8%] flex min-h-8 items-center justify-center rounded-lg border border-white/50 bg-white/75 px-3 text-center text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 shadow-sm backdrop-blur-md">
          Demo protegida
        </div>
        {item.mask === "settings" ? (
          <>
            <div className="absolute left-[60%] top-[32%] h-[15%] w-[31%] rounded-lg border border-white/50 bg-white/75 shadow-sm backdrop-blur-md" />
            <div className="absolute left-[60%] top-[64%] h-[19%] w-[31%] rounded-lg border border-white/50 bg-white/75 shadow-sm backdrop-blur-md" />
          </>
        ) : null}
        <button
          type="button"
          data-screenshot-open
          data-screenshot-src={item.image}
          data-screenshot-title={item.name}
          data-screenshot-detail={item.detail}
          className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-md border border-white/70 bg-white/90 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-800 shadow-sm backdrop-blur transition hover:bg-white sm:hidden"
        >
          <ZoomIn className="h-3.5 w-3.5" />
          Ampliar
        </button>
      </div>
      <div className="border-t border-slate-100 p-4">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">{item.detail}</p>
        <h3 className="mt-1 text-xl font-black text-slate-950">{item.name}</h3>
      </div>
    </article>
  );
}

function ExamplesGrid({ examples }: { examples: { area: string; text: string; result: string }[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {examples.map((example) => (
        <article key={`${example.area}-${example.text}`} className="marketing-spotlight reveal-on-scroll rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">{example.area}</p>
          <p className="mt-3 rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold leading-6 text-white">&ldquo;{example.text}&rdquo;</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">{example.result}</p>
        </article>
      ))}
    </div>
  );
}

function FaqBlock({ faq }: { faq: { question: string; answer: string }[] }) {
  return (
    <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white shadow-sm">
      {faq.map((item) => (
        <article key={item.question} className="reveal-on-scroll p-5">
          <h3 className="text-lg font-black text-slate-950">{item.question}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{item.answer}</p>
        </article>
      ))}
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_1.2fr_1fr]">
        <div>
          <Link href="/" className="inline-flex items-center gap-3 font-black text-slate-950">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-800 text-white">
              <Leaf className="h-5 w-5" />
            </span>
            <span>Rancho</span>
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">
            Plataforma para organizar rebanho, produção, estoque, financeiro e registros pelo WhatsApp.
          </p>
        </div>
        <div>
          <p className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">Soluções</p>
          <div className="mt-4 grid gap-3 text-sm font-bold text-slate-700 sm:grid-cols-2">
            {solutionPages.map((page) => (
              <Link key={page.slug} href={`/${page.slug}`} className="transition hover:text-emerald-700">
                {page.heroLabel}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">Confiança</p>
          <div className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
            {trustSignals.map((item) => <p key={item}>{item}</p>)}
          </div>
        </div>
      </div>
    </footer>
  );
}

function CtaBand({ title = "Quer ver o Rancho funcionando na sua fazenda?", text = "Agende uma demonstração e veja como o Rancho ajuda a organizar rebanho, produção, estoque, financeiro e WhatsApp em uma rotina mais simples de acompanhar." }) {
  return (
    <section id="contato" className="px-4 py-16 sm:px-6 lg:px-8" data-marketing-section="contato" data-section-label="Contato">
      <div className="marketing-spotlight reveal-on-scroll mx-auto max-w-5xl overflow-hidden rounded-lg bg-slate-950 p-8 text-center text-white shadow-2xl shadow-emerald-950/20 sm:p-12">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-400/15 text-emerald-200">
          <Leaf className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-black sm:text-4xl">{title}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-emerald-50">{text}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <a href={CONTACT_HREF} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-black text-emerald-800 transition hover:-translate-y-1 hover:bg-emerald-50">
            Solicitar demonstração
            <ArrowRight className="h-5 w-5" />
          </a>
          <Link href="/login" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/20 px-6 py-3 text-base font-black text-white transition hover:-translate-y-1 hover:bg-white/10">
            Entrar no sistema
            <LogIn className="h-5 w-5" />
          </Link>
        </div>
        <p className="mt-5 text-sm font-bold text-emerald-100">E-mail: {SUPPORT_EMAIL}</p>
      </div>
    </section>
  );
}

export function MarketingHomePage() {
  return (
    <>
      <StructuredData />
      <main className="min-h-screen bg-[#f8fafc] text-slate-950">
        <MarketingHeader />
        <MarketingEffects />
        <Hero
          label="Software para fazenda"
          title="Rancho: a fazenda no controle, do rebanho ao financeiro."
          text="Acompanhe produção, animais, estoque, equipe, financeiro e registros pelo WhatsApp em um sistema feito para a rotina de fazenda."
          image="/landing/screenshots/dashboard.png"
          imageAlt="Dashboard do Rancho para gestão agropecuária"
          primaryCta="Quero conhecer"
          proof={["Software para fazenda", "Bot de WhatsApp integrado", "Login para acessar o sistema"]}
        />
        <TrustStrip />

        <section className="reveal-on-scroll mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8" data-marketing-section="visao-geral" data-section-label="Visão geral">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <SectionLabel>Por que existe</SectionLabel>
              <h2 className="text-2xl font-black text-slate-950 sm:text-4xl">A fazenda trabalha melhor quando a informação não se perde.</h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                O Rancho foi pensado para tirar a gestão da mistura entre caderno, planilha e conversa solta. A equipe registra a rotina e o gestor acompanha tudo com mais clareza.
              </p>
              <div className="mt-6 grid gap-3 text-sm font-bold text-slate-700 sm:grid-cols-2">
                {["Menos erro de anotação", "Histórico confiável do rebanho", "Controle financeiro mais claro", "Uso simples para a equipe"].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <ScreenshotCard item={showcaseItems[0]} large />
          </div>
        </section>

        <section id="funcionalidades" className="bg-white py-14" data-marketing-section="funcionalidades" data-section-label="Funcionalidades">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <SectionLabel>Funcionalidades</SectionLabel>
              <h2 className="text-2xl font-black text-slate-950 sm:text-4xl">Tudo que a fazenda precisa acompanhar, em um só lugar.</h2>
              <p className="mt-4 text-base leading-7 text-slate-600">Módulos conectados para deixar a rotina da fazenda mais fácil de registrar, conferir e acompanhar.</p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {homeFeatures.slice(0, 6).map((feature) => <FeatureCard key={feature.title} item={feature} />)}
            </div>
          </div>
        </section>

        <section className="reveal-on-scroll mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8" data-marketing-section="areas" data-section-label="Áreas">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <SectionLabel>Áreas cobertas</SectionLabel>
              <h2 className="text-2xl font-black text-slate-950 sm:text-4xl">Controle para fazenda de leite, pecuária e operação rural.</h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                Cada área conversa com as outras para o produtor enxergar melhor o que acontece na fazenda, sem depender de informação espalhada.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {managementAreas.slice(0, 6).map((area) => (
                  <div key={area} className="marketing-spotlight reveal-on-scroll flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm font-black text-slate-800 shadow-sm">
                    <ClipboardCheck className="h-5 w-5 shrink-0 text-emerald-700" />
                    {area}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {solutionPages.slice(0, 4).map((page) => (
                <Link key={page.slug} href={`/${page.slug}`} className="marketing-spotlight reveal-on-scroll group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-soft">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">{page.heroLabel}</p>
                  <h3 className="mt-3 text-xl font-black text-slate-950">{page.heroTitle}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{page.description}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-emerald-700">
                    Ver página
                    <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="whatsapp" className="bg-slate-950 py-14 text-white" data-marketing-section="whatsapp" data-section-label="WhatsApp">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-8">
            <div>
              <SectionLabel dark>WhatsApp integrado</SectionLabel>
              <h2 className="text-2xl font-black sm:text-4xl">Registre a rotina da fazenda direto pelo WhatsApp.</h2>
              <p className="mt-5 text-base leading-8 text-slate-300">
                A equipe manda uma mensagem simples e o Rancho organiza o registro para aparecer no painel certo, sem transformar tudo em planilha.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {["Bot de WhatsApp integrado", "Registro rápido da rotina", "Consultas e tabelas por mensagem", "Dados direto no painel"].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm font-bold text-slate-200">
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <ScreenshotCard item={showcaseItems[7]} large />
          </div>
        </section>

        <section id="exemplos" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8" data-marketing-section="exemplos" data-section-label="Exemplos">
          <div className="mx-auto max-w-3xl text-center">
            <SectionLabel>Exemplos reais</SectionLabel>
            <h2 className="text-2xl font-black text-slate-950 sm:text-4xl">Mensagens simples viram controle da fazenda.</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              A mensagem continua simples para quem está no campo, e o Rancho organiza tudo para virar controle dentro do sistema.
            </p>
          </div>
          <div className="mt-10">
            <ExamplesGrid examples={homeExamples.slice(0, 4)} />
          </div>
        </section>

        <section id="prints" className="bg-white py-14" data-marketing-section="produto" data-section-label="Produto">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div className="max-w-3xl">
                <SectionLabel>Prévia do sistema</SectionLabel>
                <h2 className="text-2xl font-black text-slate-950 sm:text-4xl">Telas reais para entender como o Rancho funciona.</h2>
                <p className="mt-4 text-base leading-7 text-slate-600">
                  Selecionamos telas do sistema para mostrar a rotina com clareza, sem encher a página de informação repetida.
                </p>
              </div>
              <Link href="/login" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-1 hover:border-emerald-300 hover:text-emerald-700">
                Ir para o login
                <LogIn className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              {homeScreenshots.map((item) => <ScreenshotCard key={item.name} item={item} />)}
            </div>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8" data-marketing-section="faq" data-section-label="FAQ">
          <SectionLabel>Perguntas frequentes</SectionLabel>
          <h2 className="max-w-3xl text-2xl font-black text-slate-950 sm:text-4xl">Dúvidas comuns sobre o Rancho.</h2>
          <div className="mt-8">
            <FaqBlock faq={homeFaq} />
          </div>
        </section>

        <CtaBand />
        <Footer />
      </main>
    </>
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
      <main className="min-h-screen bg-[#f8fafc] text-slate-950">
        <MarketingHeader currentSlug={page.slug} />
        <MarketingEffects />
        <Hero
          label={page.heroLabel}
          title={page.heroTitle}
          text={page.heroText}
          image={page.heroImage}
          imageAlt={page.heroImageAlt}
          primaryCta={page.primaryCta}
          proof={page.proof}
        />
        <TrustStrip />

        <section className="reveal-on-scroll mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8" data-marketing-section="visao-geral" data-section-label="Visão geral">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
            <div>
              <SectionLabel>Visão geral</SectionLabel>
              <h2 className="text-2xl font-black text-slate-950 sm:text-4xl">{page.introTitle}</h2>
              <p className="mt-5 text-base leading-8 text-slate-600">{page.introText}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {page.benefits.map((benefit) => <FeatureCard key={benefit.title} item={benefit} />)}
            </div>
          </div>
        </section>

        <section className="bg-white py-14" data-marketing-section="pratica" data-section-label="Na prática">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
            <div>
              <SectionLabel>Na prática</SectionLabel>
              <h2 className="text-2xl font-black text-slate-950 sm:text-4xl">{page.workflowTitle}</h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                O fluxo foi pensado para a equipe registrar sem complicação e para a gestão acompanhar com confiança.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {page.workflow.map((step, index) => (
                <div key={step} className="marketing-spotlight reveal-on-scroll rounded-lg border border-slate-200 bg-slate-50 p-5">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-700 text-lg font-black text-white">{index + 1}</div>
                  <p className="text-lg font-black leading-7 text-slate-950">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-14" data-marketing-section="produto" data-section-label="Produto">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <SectionLabel>Produto real</SectionLabel>
              <h2 className="text-2xl font-black text-slate-950 sm:text-4xl">Telas reais para ver o Rancho em uso.</h2>
              <p className="mt-4 text-base leading-7 text-slate-600">Prints do sistema com dados protegidos, mostrando como a rotina aparece no painel.</p>
            </div>
            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              {visibleScreenshots.map((item) => <ScreenshotCard key={item.name} item={item} />)}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:px-8" data-marketing-section="faq" data-section-label="FAQ">
          <div>
            <SectionLabel>Perguntas frequentes</SectionLabel>
            <h2 className="text-2xl font-black text-slate-950 sm:text-4xl">O que o produtor costuma querer saber.</h2>
          </div>
          <FaqBlock faq={page.faq} />
        </section>

        <section className="bg-slate-950 py-14 text-white" data-marketing-section="relacionados" data-section-label="Relacionados">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionLabel dark>Também pode ajudar</SectionLabel>
            <div className="grid gap-4 md:grid-cols-3">
              {relatedPages.map((related) => (
                <Link key={related.slug} href={`/${related.slug}`} className="marketing-spotlight reveal-on-scroll group rounded-lg border border-white/10 bg-white/[0.06] p-5 transition hover:-translate-y-1 hover:border-emerald-300/60 hover:bg-white/[0.09]">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-200">{related.heroLabel}</p>
                  <h3 className="mt-3 text-xl font-black text-white">{related.heroTitle}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{related.description}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-emerald-200">
                    Ver solução
                    <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <CtaBand title={`Quer usar o Rancho para ${page.heroLabel.toLowerCase()}?`} text="Agende uma demonstração e veja essa rotina funcionando no sistema, do registro pelo WhatsApp ao acompanhamento no painel." />
        <Footer />
      </main>
    </>
  );
}
