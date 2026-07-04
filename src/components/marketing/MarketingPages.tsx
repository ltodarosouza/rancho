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

function SectionLabel({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <p className={`mb-3 inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${dark ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
      <Leaf className="h-3.5 w-3.5" />
      {children}
    </p>
  );
}

function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-emerald-900/10 bg-white/88 shadow-sm shadow-slate-950/[0.03] backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3 font-black text-slate-950" aria-label="Rancho">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-800 text-white shadow-lg shadow-emerald-900/20">
            <Leaf className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-lg leading-tight">Rancho</span>
            <span className="block truncate text-xs font-bold text-slate-500">Gestão agropecuária</span>
          </span>
        </Link>
        <div className="hidden items-center gap-5 text-sm font-bold text-slate-600 lg:flex">
          <Link className="transition hover:text-emerald-700" href="/software-para-fazenda">Software</Link>
          <Link className="transition hover:text-emerald-700" href="/controle-de-rebanho">Rebanho</Link>
          <Link className="transition hover:text-emerald-700" href="/controle-leiteiro">Leite</Link>
          <Link className="transition hover:text-emerald-700" href="/bot-whatsapp-fazenda">WhatsApp</Link>
          <Link className="transition hover:text-emerald-700" href="/financeiro-rural">Financeiro</Link>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/login" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700">
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">Entrar</span>
          </Link>
          <a href={CONTACT_HREF} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 text-sm font-black text-white shadow-lg shadow-emerald-800/20 transition hover:-translate-y-0.5 hover:bg-emerald-800 sm:px-4">
            <span className="hidden sm:inline">Solicitar demonstração</span>
            <span className="sm:hidden">Demo</span>
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </nav>
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
    <section className="relative isolate overflow-hidden bg-slate-950 text-white">
      <div
        aria-label={imageAlt}
        role="img"
        className="absolute inset-0 z-0 bg-cover bg-top"
        style={{ backgroundImage: `url(${image})` }}
      />
      <div className="absolute inset-0 z-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.94)_0%,rgba(2,6,23,0.78)_36%,rgba(2,6,23,0.34)_68%,rgba(2,6,23,0.08)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 z-0 h-44 bg-gradient-to-t from-slate-950 to-transparent" />
      <div className="relative z-10 mx-auto flex min-h-[76svh] max-w-7xl items-end px-4 pb-12 pt-24 sm:px-6 sm:pb-16 lg:px-8">
        <div className="max-w-4xl animate-fade-in">
          <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-emerald-300/30 bg-white/10 px-3 py-1 text-sm font-black text-emerald-100 shadow-sm backdrop-blur">
            <ShieldCheck className="h-4 w-4" />
            {label}
          </div>
          <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-normal sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-100">
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
          <div className="mt-8 grid max-w-3xl gap-3 text-sm font-bold text-slate-100 sm:grid-cols-3">
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
    <article className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-soft">
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
    <article className={`group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-soft ${large ? "lg:col-span-2" : ""}`}>
      <div className="relative aspect-[16/10] overflow-hidden bg-white">
        <Image
          src={item.image}
          alt={`Tela do Rancho: ${item.name}`}
          width={2160}
          height={1350}
          unoptimized
          loading={large ? "eager" : "lazy"}
          decoding="async"
          sizes={large ? "(min-width: 1024px) 100vw, 100vw" : "(min-width: 1024px) 50vw, 100vw"}
          className="h-full w-full object-contain object-top"
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
        <article key={`${example.area}-${example.text}`} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
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
        <article key={item.question} className="p-5">
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
            Sistema em evolução para gestão agropecuária, controle de rebanho, produção de leite e registros pelo WhatsApp.
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

function CtaBand({ title = "Quer ver o Rancho funcionando na sua fazenda?", text = "Solicite uma demonstração e veja como organizar rebanho, estoque, produção, financeiro e WhatsApp em uma rotina mais clara." }) {
  return (
    <section id="contato" className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl rounded-lg bg-slate-950 p-8 text-center text-white shadow-2xl shadow-emerald-950/20 sm:p-12">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-400/15 text-emerald-200">
          <Leaf className="h-7 w-7" />
        </div>
        <h2 className="text-3xl font-black sm:text-4xl">{title}</h2>
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
      <main className="min-h-screen overflow-hidden bg-[#f8fafc] text-slate-950">
        <MarketingHeader />
        <Hero
          label="Software de gestão agropecuária"
          title="Rancho: controle de fazenda, rebanho e leite em um só sistema."
          text="Organize produção de leite, rebanho bovino, estoque rural, financeiro, funcionários, genealogia e registros pelo WhatsApp com uma experiência clara para a equipe."
          image="/landing/screenshots/dashboard.jpg"
          imageAlt="Dashboard do Rancho para gestão agropecuária"
          primaryCta="Quero conhecer"
          proof={["Software para fazenda", "Bot de WhatsApp integrado", "Login para acessar o sistema"]}
        />
        <TrustStrip />

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <SectionLabel>Por que existe</SectionLabel>
              <h2 className="text-3xl font-black text-slate-950 sm:text-4xl">A fazenda ganha velocidade quando o dado nasce organizado.</h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                O Rancho foi pensado para tirar a gestão da mistura entre caderno, planilha e conversa solta. A equipe registra a rotina, o sistema valida e o gestor acompanha tudo com mais confiança.
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

        <section id="funcionalidades" className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <SectionLabel>Funcionalidades</SectionLabel>
              <h2 className="text-3xl font-black text-slate-950 sm:text-4xl">Tudo que a fazenda precisa acompanhar, sem espalhar a informação.</h2>
              <p className="mt-4 text-base leading-7 text-slate-600">Módulos conectados para transformar rotina operacional em dados úteis para decisão.</p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {homeFeatures.map((feature) => <FeatureCard key={feature.title} item={feature} />)}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <SectionLabel>Áreas cobertas</SectionLabel>
              <h2 className="text-3xl font-black text-slate-950 sm:text-4xl">Controle completo para fazenda de leite, pecuária e operação rural.</h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                A página principal abre o caminho, e as páginas específicas ajudam o Google e o produtor a entenderem cada solução com mais profundidade.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {managementAreas.map((area) => (
                  <div key={area} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm font-black text-slate-800 shadow-sm">
                    <ClipboardCheck className="h-5 w-5 shrink-0 text-emerald-700" />
                    {area}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {solutionPages.slice(0, 4).map((page) => (
                <Link key={page.slug} href={`/${page.slug}`} className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-soft">
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

        <section id="whatsapp" className="bg-slate-950 py-16 text-white">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-8">
            <div>
              <SectionLabel dark>WhatsApp integrado</SectionLabel>
              <h2 className="text-3xl font-black sm:text-4xl">A equipe registra a rotina onde ela já conversa.</h2>
              <p className="mt-5 text-base leading-8 text-slate-300">
                O funcionário envia uma mensagem, o bot interpreta, o backend valida e a ação só é salva depois da confirmação. O resultado aparece no painel certo.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {["Interpretação por IA", "Confirmação antes de salvar", "Consultas e registros compostos", "Dados conectados ao painel"].map((item) => (
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

        <section id="exemplos" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <SectionLabel>Exemplos reais</SectionLabel>
            <h2 className="text-3xl font-black text-slate-950 sm:text-4xl">Mensagens simples viram registros organizados.</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              A comunicação continua natural, mas o sistema transforma o texto em dados estruturados para confirmar e salvar.
            </p>
          </div>
          <div className="mt-10">
            <ExamplesGrid examples={homeExamples} />
          </div>
        </section>

        <section id="prints" className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div className="max-w-3xl">
                <SectionLabel>Prévia do sistema</SectionLabel>
                <h2 className="text-3xl font-black text-slate-950 sm:text-4xl">Imagens reais do produto, com dados sensíveis protegidos.</h2>
                <p className="mt-4 text-base leading-7 text-slate-600">
                  Mantivemos os melhores prints para mostrar o produto com clareza, sem encher a página de telas repetidas.
                </p>
              </div>
              <Link href="/login" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-1 hover:border-emerald-300 hover:text-emerald-700">
                Ir para o login
                <LogIn className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              {homeScreenshots.map((item, index) => <ScreenshotCard key={item.name} item={item} large={index === 0} />)}
            </div>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <SectionLabel>Perguntas frequentes</SectionLabel>
          <h2 className="max-w-3xl text-3xl font-black text-slate-950 sm:text-4xl">Dúvidas comuns sobre o Rancho.</h2>
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

  return (
    <>
      <StructuredData page={page} />
      <main className="min-h-screen overflow-hidden bg-[#f8fafc] text-slate-950">
        <MarketingHeader />
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

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
            <div>
              <SectionLabel>Visão geral</SectionLabel>
              <h2 className="text-3xl font-black text-slate-950 sm:text-4xl">{page.introTitle}</h2>
              <p className="mt-5 text-base leading-8 text-slate-600">{page.introText}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {page.benefits.map((benefit) => <FeatureCard key={benefit.title} item={benefit} />)}
            </div>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
            <div>
              <SectionLabel>Na prática</SectionLabel>
              <h2 className="text-3xl font-black text-slate-950 sm:text-4xl">{page.workflowTitle}</h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                O fluxo foi desenhado para ser simples para a equipe e confiável para quem acompanha a gestão.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {page.workflow.map((step, index) => (
                <div key={step} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-700 text-lg font-black text-white">{index + 1}</div>
                  <p className="text-lg font-black leading-7 text-slate-950">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <SectionLabel>Exemplos</SectionLabel>
            <h2 className="text-3xl font-black text-slate-950 sm:text-4xl">Como o Rancho aparece na rotina.</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">Exemplos de mensagens e ações que ajudam o público a entender o valor antes de pedir demonstração.</p>
          </div>
          <div className="mt-10">
            <ExamplesGrid examples={page.examples} />
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <SectionLabel>Produto real</SectionLabel>
              <h2 className="text-3xl font-black text-slate-950 sm:text-4xl">Telas que mostram o funcionamento, não só promessa.</h2>
              <p className="mt-4 text-base leading-7 text-slate-600">Prints do ambiente demonstrativo do Rancho, com dados sensíveis mascarados.</p>
            </div>
            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              {page.screenshots.map((item, index) => <ScreenshotCard key={item.name} item={item} large={index === 0} />)}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:px-8">
          <div>
            <SectionLabel>Perguntas frequentes</SectionLabel>
            <h2 className="text-3xl font-black text-slate-950 sm:text-4xl">O que o produtor costuma querer saber.</h2>
          </div>
          <FaqBlock faq={page.faq} />
        </section>

        <section className="bg-slate-950 py-16 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionLabel dark>Também pode ajudar</SectionLabel>
            <div className="grid gap-4 md:grid-cols-3">
              {relatedPages.map((related) => (
                <Link key={related.slug} href={`/${related.slug}`} className="group rounded-lg border border-white/10 bg-white/[0.06] p-5 transition hover:-translate-y-1 hover:border-emerald-300/60 hover:bg-white/[0.09]">
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

        <CtaBand title={`Quer usar o Rancho para ${page.heroLabel.toLowerCase()}?`} text="Solicite uma demonstração e veja como essa rotina fica dentro do sistema, do registro pelo WhatsApp ao acompanhamento no painel." />
        <Footer />
      </main>
    </>
  );
}
