import type { Metadata } from "next";
import { absoluteSiteUrl, LANDING_DESCRIPTION, LANDING_TITLE, SEO_KEYWORDS, SITE_NAME, SUPPORT_EMAIL } from "@/lib/seo";

export { SUPPORT_EMAIL };

export type MarketingIcon =
  | "bar-chart"
  | "bot"
  | "boxes"
  | "clipboard"
  | "droplets"
  | "git-fork"
  | "leaf"
  | "message"
  | "paw"
  | "shield"
  | "users"
  | "wallet";

export type MarketingScreenshot = {
  name: string;
  detail: string;
  image: string;
  mask?: "settings";
};

export type MarketingFeature = {
  icon: MarketingIcon;
  title: string;
  description: string;
};

export type MarketingFaq = {
  question: string;
  answer: string;
};

export type MarketingExample = {
  area: string;
  text: string;
  result: string;
};

export type MarketingPageContent = {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  heroLabel: string;
  heroTitle: string;
  heroText: string;
  heroImage: string;
  heroImageAlt: string;
  primaryCta: string;
  proof: string[];
  introTitle: string;
  introText: string;
  benefits: MarketingFeature[];
  workflowTitle: string;
  workflow: string[];
  examples: MarketingExample[];
  faq: MarketingFaq[];
  screenshots: MarketingScreenshot[];
  related: string[];
};

export const CONTACT_HREF = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Quero conhecer o Rancho")}&body=${encodeURIComponent("Olá, gostaria de conhecer o Rancho e ver uma demonstração.\n\nNome:\nFazenda:\nTelefone:")}`;

export const founders = ["Lucas Todaro", "Henrique Guimarães"];
export const companyLocation = "João Pessoa, Paraíba";

export const trustSignals = [
  "Projeto criado em João Pessoa/PB",
  "Feito por Lucas Todaro e Henrique Guimarães",
  "Contato direto: assistencia.rancho@gmail.com"
];

export const showcaseItems: MarketingScreenshot[] = [
  { name: "Dashboard", detail: "Indicadores gerais", image: "/landing/screenshots/dashboard.png" },
  { name: "Rebanho", detail: "Animais e ficha individual", image: "/landing/screenshots/rebanho.png" },
  { name: "Genealogia", detail: "Árvore familiar dos animais", image: "/landing/screenshots/genealogia.png" },
  { name: "Produção", detail: "Ordenhas e destino do leite", image: "/landing/screenshots/producao.png" },
  { name: "Estoque", detail: "Entradas, baixas e saldo", image: "/landing/screenshots/estoque.png" },
  { name: "Financeiro", detail: "Entradas, saídas e categorias", image: "/landing/screenshots/financeiro.png" },
  { name: "Funcionários", detail: "Equipe, convites e ponto", image: "/landing/screenshots/funcionarios.png" },
  { name: "WhatsApp", detail: "Bot e números autorizados", image: "/landing/screenshots/whatsapp.png" },
  { name: "Configurações", detail: "Preferências e dados protegidos", image: "/landing/screenshots/configuracoes.png", mask: "settings" }
];

export const homeFeatures: MarketingFeature[] = [
  { icon: "bar-chart", title: "Painel da fazenda", description: "Veja produção, estoque, equipe e financeiro em uma visão fácil de acompanhar." },
  { icon: "paw", title: "Rebanho organizado", description: "Controle animais, fases, lotes e histórico individual sem perder informação." },
  { icon: "droplets", title: "Produção de leite", description: "Registre ordenhas e acompanhe a produção da fazenda ao longo do tempo." },
  { icon: "boxes", title: "Estoque rural", description: "Acompanhe entradas, baixas, unidades e itens que precisam de atenção." },
  { icon: "wallet", title: "Financeiro rural", description: "Veja receitas, despesas e custos ligados à rotina da fazenda." },
  { icon: "users", title: "Equipe e ponto", description: "Organize funcionários, acessos e registros de trabalho em um só lugar." },
  { icon: "git-fork", title: "Genealogia", description: "Acompanhe família, descendentes e informações importantes dos animais." },
  { icon: "bot", title: "Bot de WhatsApp", description: "A equipe registra por mensagem e o Rancho leva o dado para o painel certo." }
];

export const homeExamples: MarketingExample[] = [
  { area: "Produção de leite", text: "B-002 deu 32 litros hoje", result: "Ordenha registrada no histórico da fazenda." },
  { area: "Estoque e financeiro", text: "vendi 4 sacos de milho por 320 reais", result: "Estoque e financeiro atualizados juntos." },
  { area: "Compra de insumos", text: "comprei 12 sacos de ração por 960 reais", result: "Compra organizada no estoque e no caixa." },
  { area: "Parto e cria", text: "a vaca B-5 pariu uma bezerra hoje, código B-941", result: "Parto, cria e genealogia no mesmo fluxo." },
  { area: "Saúde animal", text: "apliquei vacina clostridial na B-001 hoje", result: "Evento de saúde salvo no animal certo." },
  { area: "Morte de animal", text: "a vaca Estrela morreu hoje", result: "Status do animal atualizado no rebanho." },
  { area: "Funcionários", text: "João entrou às 7h e saiu às 17h", result: "Ponto pronto para acompanhar a equipe." },
  { area: "Relatórios", text: "como foi o financeiro desse mês?", result: "Resumo do período em linguagem simples." }
];

export const homeFaq: MarketingFaq[] = [
  {
    question: "O Rancho serve para controlar rebanho e produção de leite?",
    answer: "Sim. O Rancho reúne ficha dos animais, lotes, reprodução, genealogia, ordenhas, produção de leite, estoque, financeiro e relatórios."
  },
  {
    question: "Consigo registrar dados da fazenda pelo WhatsApp?",
    answer: "Sim. A equipe pode enviar mensagens simples para o bot e o Rancho organiza o registro no lugar certo."
  },
  {
    question: "O Rancho substitui planilhas e cadernos da fazenda?",
    answer: "Ele foi pensado para centralizar informações que normalmente ficam em cadernos, planilhas e conversas soltas."
  },
  {
    question: "Quais áreas da fazenda o sistema acompanha?",
    answer: "O Rancho acompanha rebanho, produção de leite, estoque, financeiro, funcionários, ponto, folha, reprodução, genealogia e eventos sanitários."
  }
];

export const solutionPages: MarketingPageContent[] = [
  {
    slug: "software-para-fazenda",
    title: "Software para fazenda",
    description: "Software para fazenda com controle de rebanho, produção de leite, estoque, financeiro, funcionários e registros pelo WhatsApp.",
    keywords: ["software para fazenda", "sistema para fazenda", "gestão de fazenda", "controle de fazenda"],
    heroLabel: "Software para fazenda",
    heroTitle: "Controle a fazenda sem depender de caderno, planilha e memória.",
    heroText: "O Rancho reúne rebanho, produção, estoque, financeiro, equipe e WhatsApp em uma plataforma feita para a rotina de fazenda.",
    heroImage: "/landing/screenshots/dashboard.png",
    heroImageAlt: "Dashboard do software para fazenda Rancho",
    primaryCta: "Conhecer o sistema",
    proof: ["Painel único da fazenda", "Registro pelo WhatsApp", "Acesso web para equipe e gestão"],
    introTitle: "A rotina da fazenda fica mais leve quando a informação fica no lugar certo.",
    introText: "Quando cada área anota de um jeito, o produtor perde histórico, tempo e confiança nos números. O Rancho conecta as rotinas principais para transformar registros simples em acompanhamento de verdade.",
    benefits: [
      { icon: "bar-chart", title: "Visão geral da fazenda", description: "Veja produção, financeiro, rebanho e estoque sem procurar dado em vários lugares." },
      { icon: "message", title: "Registro pelo WhatsApp", description: "A equipe informa a rotina por mensagem e o Rancho organiza no painel." },
      { icon: "shield", title: "Mais segurança no registro", description: "Antes de salvar uma ação importante, o bot mostra o que entendeu." }
    ],
    workflowTitle: "Como funciona na prática",
    workflow: ["Cadastre a fazenda e a equipe.", "Organize animais, lotes, estoque e financeiro.", "Registre pelo painel ou pelo WhatsApp.", "Acompanhe indicadores, histórico e relatórios."],
    examples: homeExamples.slice(0, 4),
    faq: [
      { question: "Esse software para fazenda funciona para pecuária leiteira?", answer: "Sim. O Rancho cobre produção de leite, rebanho, reprodução, estoque, financeiro e equipe." },
      { question: "Preciso abandonar o WhatsApp da equipe?", answer: "Não. A proposta é aproveitar o que a equipe já usa e transformar mensagens em registros organizados." },
      { question: "O sistema tem login?", answer: "Sim. O Rancho tem área interna protegida para acessar os dados da fazenda." }
    ],
    screenshots: [showcaseItems[0], showcaseItems[1], showcaseItems[3], showcaseItems[7]],
    related: ["controle-de-rebanho", "controle-leiteiro", "financeiro-rural"]
  },
  {
    slug: "controle-de-rebanho",
    title: "Controle de rebanho bovino",
    description: "Controle de rebanho bovino com ficha do animal, lotes, status, eventos, genealogia, reprodução e histórico completo.",
    keywords: ["controle de rebanho", "controle de rebanho bovino", "gestão de animais", "ficha de animal bovino"],
    heroLabel: "Controle de rebanho",
    heroTitle: "Cada animal com ficha clara e histórico fácil de consultar.",
    heroText: "Organize brincos, nomes, fases, lotes, status, genealogia, reprodução e ocorrências para saber a situação de cada animal.",
    heroImage: "/landing/screenshots/rebanho.png",
    heroImageAlt: "Tela de controle de rebanho bovino do Rancho",
    primaryCta: "Organizar meu rebanho",
    proof: ["Ficha individual por animal", "Lotes e fases produtivas", "Histórico ligado à reprodução e saúde"],
    introTitle: "O rebanho precisa de histórico, não só de uma lista de animais.",
    introText: "O Rancho ajuda a acompanhar cada animal por código, lote, fase, eventos, partos, tratamentos e família, deixando a informação pronta para consulta.",
    benefits: [
      { icon: "paw", title: "Ficha individual", description: "Tenha código, nome, categoria, sexo, raça, lote, peso e status em um só lugar." },
      { icon: "clipboard", title: "Eventos no histórico", description: "Vacinas, partos, mortes, observações e manejos ficam ligados ao animal certo." },
      { icon: "git-fork", title: "Genealogia", description: "Visualize vínculos familiares e descendentes diretos." }
    ],
    workflowTitle: "Como o controle acontece",
    workflow: ["Cadastre animais individualmente ou por tabela.", "Separe por lotes e fases produtivas.", "Registre eventos pelo painel ou WhatsApp.", "Consulte histórico, genealogia e situação atual."],
    examples: [
      { area: "Cadastro", text: "criar vaca Mimosa código B-001 no lote Lactação", result: "Ficha do animal criada para acompanhar no rebanho." },
      { area: "Lote", text: "troca o lote da B-010 para Bezerros", result: "Mudança de lote organizada no animal certo." },
      { area: "Consulta", text: "como tá a vaca 090?", result: "Resumo da ficha e dos eventos recentes." }
    ],
    faq: [
      { question: "Dá para importar animais por tabela?", answer: "Sim. O Rancho lê tabelas de animais e mostra o que precisa ser ajustado antes do cadastro." },
      { question: "O sistema aceita lotes?", answer: "Sim. Os lotes ajudam a organizar manejo, fase, piquete e grupos produtivos." },
      { question: "Consigo ver histórico de cada animal?", answer: "Sim. A ficha reúne dados cadastrais e eventos relevantes." }
    ],
    screenshots: [showcaseItems[1], showcaseItems[2], showcaseItems[8]],
    related: ["controle-leiteiro", "gestao-de-gado-leiteiro", "bot-whatsapp-fazenda"]
  },
  {
    slug: "controle-leiteiro",
    title: "Controle leiteiro e produção de leite",
    description: "Controle leiteiro para registrar ordenhas, acompanhar litros produzidos, destino do leite e evolução da produção da fazenda.",
    keywords: ["controle leiteiro", "produção de leite", "controle de ordenha", "sistema para produção de leite"],
    heroLabel: "Controle leiteiro",
    heroTitle: "Produção de leite registrada com clareza, todo dia.",
    heroText: "Acompanhe litros, destino do leite, média diária e histórico de produção sem depender de planilha manual.",
    heroImage: "/landing/screenshots/producao.png",
    heroImageAlt: "Tela de produção de leite do Rancho",
    primaryCta: "Controlar produção",
    proof: ["Litros por período", "Registro por animal", "Relatórios de produção"],
    introTitle: "A ordenha vira gestão quando o número não fica perdido.",
    introText: "O Rancho transforma registros simples de produção em acompanhamento do dia, do mês e dos animais mais importantes da fazenda.",
    benefits: [
      { icon: "droplets", title: "Litros organizados", description: "Registre produção total, por animal ou por destino." },
      { icon: "bar-chart", title: "Evolução visível", description: "Veja médias e totais para entender a tendência da fazenda." },
      { icon: "message", title: "Entrada rápida", description: "A produção pode ser informada pelo WhatsApp e acompanhada no painel." }
    ],
    workflowTitle: "Rotina simples de controle",
    workflow: ["Registre a produção do dia.", "Informe animal, quantidade e destino quando precisar.", "Revise o lançamento.", "Consulte totais e médias por período."],
    examples: [
      { area: "Ordenha", text: "B-002 deu 32 litros hoje", result: "Produção registrada para a vaca B-002." },
      { area: "Consulta", text: "quanto produzi de leite hoje?", result: "Total do dia e registros encontrados." },
      { area: "Relatório", text: "produção de leite desse mês", result: "Resumo do período com litros e média." }
    ],
    faq: [
      { question: "Posso registrar produção por animal?", answer: "Sim. O Rancho aceita registros ligados a animais específicos quando a fazenda usa esse nível de controle." },
      { question: "Consigo consultar produção por período?", answer: "Sim. O bot e o painel ajudam a consultar hoje, mês ou outros períodos." },
      { question: "O controle leiteiro aparece no dashboard?", answer: "Sim. A produção alimenta os indicadores principais da fazenda." }
    ],
    screenshots: [showcaseItems[3], showcaseItems[0], showcaseItems[7]],
    related: ["software-para-fazenda", "gestao-de-gado-leiteiro", "controle-de-rebanho"]
  },
  {
    slug: "gestao-de-gado-leiteiro",
    title: "Gestão de gado leiteiro",
    description: "Gestão de gado leiteiro com reprodução, partos, genealogia, produção, lotes, saúde animal e controle financeiro.",
    keywords: ["gestão de gado leiteiro", "sistema para gado leiteiro", "pecuária leiteira", "fazenda de leite"],
    heroLabel: "Gado leiteiro",
    heroTitle: "Gado leiteiro com produção, reprodução e histórico no mesmo lugar.",
    heroText: "Acompanhe vacas em lactação, partos, prenhez, genealogia, ordenha, estoque e financeiro com uma rotina mais conectada.",
    heroImage: "/landing/screenshots/genealogia.png",
    heroImageAlt: "Tela de genealogia bovina do Rancho",
    primaryCta: "Ver gestão leiteira",
    proof: ["Lactação e reprodução", "Partos e crias", "Histórico produtivo e sanitário"],
    introTitle: "Na fazenda de leite, produção e reprodução andam juntas.",
    introText: "O Rancho ajuda a relacionar rebanho, produção, reprodução, tratamentos e custos do dia a dia, sem separar tudo em controles diferentes.",
    benefits: [
      { icon: "droplets", title: "Produção conectada", description: "Acompanhe ordenhas e evolução produtiva junto do histórico do animal." },
      { icon: "git-fork", title: "Partos e genealogia", description: "Registre partos, crias e vínculos familiares de forma organizada." },
      { icon: "clipboard", title: "Eventos sanitários", description: "Vacinas, tratamentos e observações ficam ligados ao rebanho." }
    ],
    workflowTitle: "Do parto ao relatório",
    workflow: ["Cadastre vacas, touros e crias.", "Registre produção, partos e protocolos.", "Acompanhe histórico e genealogia.", "Use relatórios para decidir próximos manejos."],
    examples: [
      { area: "Parto", text: "a vaca B-5 pariu uma bezerra hoje, código B-941", result: "Parto, cria e descendência preparados." },
      { area: "Protocolo", text: "a 090 entrou em protocolo hoje", result: "Evento reprodutivo salvo no histórico." },
      { area: "Consulta", text: "me manda a lista das vacas prenhas", result: "Consulta filtrada de reprodução." }
    ],
    faq: [
      { question: "O Rancho controla partos e crias?", answer: "Sim. O sistema registra parto, cria, vínculo com a mãe e pai quando informado." },
      { question: "Dá para acompanhar vacas em protocolo?", answer: "Sim. Eventos reprodutivos como protocolo, reteste, prenhez e parto entram no histórico." },
      { question: "A genealogia aparece no sistema?", answer: "Sim. A área de genealogia mostra relações familiares e descendentes." }
    ],
    screenshots: [showcaseItems[2], showcaseItems[3], showcaseItems[1], showcaseItems[0]],
    related: ["controle-de-rebanho", "controle-leiteiro", "bot-whatsapp-fazenda"]
  },
  {
    slug: "financeiro-rural",
    title: "Financeiro rural e controle de custos",
    description: "Financeiro rural para controlar receitas, despesas, vendas, compras de insumos, estoque e resultado da fazenda.",
    keywords: ["financeiro rural", "controle financeiro fazenda", "fluxo de caixa rural", "custos da fazenda"],
    heroLabel: "Financeiro rural",
    heroTitle: "Financeiro rural ligado à rotina da fazenda.",
    heroText: "Controle vendas, compras, gastos e resultado da fazenda com lançamentos conectados ao estoque e aos registros do dia.",
    heroImage: "/landing/screenshots/financeiro.png",
    heroImageAlt: "Tela de financeiro rural do Rancho",
    primaryCta: "Organizar financeiro",
    proof: ["Entradas e saídas", "Categorias de custo", "Integração com estoque"],
    introTitle: "O financeiro fica mais claro quando acompanha o que aconteceu no campo.",
    introText: "Ao registrar compra, venda ou uso de insumo, o Rancho ajuda a manter financeiro e estoque alinhados, reduzindo retrabalho e diferença de informação.",
    benefits: [
      { icon: "wallet", title: "Fluxo de caixa", description: "Veja entradas, saídas e saldo por período." },
      { icon: "boxes", title: "Estoque conectado", description: "Compras e vendas podem movimentar produtos e insumos." },
      { icon: "bar-chart", title: "Resumo para decisão", description: "Relatórios ajudam a entender de onde vem o dinheiro e para onde ele vai." }
    ],
    workflowTitle: "Como os lançamentos entram",
    workflow: ["Registre venda, compra ou despesa.", "Informe valor, categoria e item quando houver.", "Revise o lançamento.", "Consulte resumo financeiro por período."],
    examples: [
      { area: "Venda", text: "vendi 4 sacos de milho por 320 reais", result: "Receita e baixa de estoque conectadas." },
      { area: "Compra", text: "comprei 12 sacos de ração por 960 reais", result: "Despesa e entrada no estoque preparadas." },
      { area: "Consulta", text: "quanto gastei com ração esse mês?", result: "Resumo filtrado por categoria ou item." }
    ],
    faq: [
      { question: "O financeiro conversa com o estoque?", answer: "Sim. O Rancho pode registrar movimentação de estoque e lançamento financeiro no mesmo fluxo." },
      { question: "Consigo consultar gastos por período?", answer: "Sim. O bot e o painel ajudam a consultar hoje, mês e outros filtros." },
      { question: "Serve para pequenas fazendas?", answer: "Sim. A proposta é deixar o controle simples para quem precisa sair da planilha." }
    ],
    screenshots: [showcaseItems[5], showcaseItems[4], showcaseItems[0], showcaseItems[7]],
    related: ["software-para-fazenda", "controle-leiteiro", "bot-whatsapp-fazenda"]
  },
  {
    slug: "bot-whatsapp-fazenda",
    title: "Bot de WhatsApp para fazenda",
    description: "Bot de WhatsApp para fazenda registrar produção, estoque, financeiro, partos, vacinas, mortes e consultas no Rancho.",
    keywords: ["bot WhatsApp fazenda", "chatbot para fazenda", "WhatsApp agropecuária", "registrar fazenda por WhatsApp"],
    heroLabel: "WhatsApp para fazenda",
    heroTitle: "O WhatsApp da fazenda vira registro organizado no Rancho.",
    heroText: "A equipe manda mensagens simples e acompanha produção, estoque, financeiro, rebanho, reprodução, saúde animal e relatórios no sistema.",
    heroImage: "/landing/screenshots/whatsapp.png",
    heroImageAlt: "Tela do bot de WhatsApp para fazenda no Rancho",
    primaryCta: "Testar o bot",
    proof: ["Bot de WhatsApp integrado", "Registro rápido da rotina", "Informação direto no painel"],
    introTitle: "O melhor registro é aquele que a equipe consegue fazer na hora.",
    introText: "Em vez de obrigar todo mundo a abrir telas, o Rancho permite informar a rotina por mensagem e organiza esses dados para a gestão acompanhar.",
    benefits: [
      { icon: "message", title: "Mensagem simples", description: "A equipe escreve como fala na rotina da fazenda." },
      { icon: "bot", title: "Bot integrado ao Rancho", description: "O que chega pelo WhatsApp aparece organizado no sistema." },
      { icon: "shield", title: "Mais controle", description: "Ações importantes podem ser revisadas antes de entrar no histórico da fazenda." }
    ],
    workflowTitle: "Como funciona no dia a dia",
    workflow: ["A equipe envia uma mensagem pelo WhatsApp.", "O Rancho entende o registro e organiza os dados.", "Você revisa quando a ação for importante.", "O lançamento aparece no painel certo."],
    examples: homeExamples,
    faq: [
      { question: "O bot salva direto sem confirmar?", answer: "Quando a ação altera dados importantes, o Rancho pode pedir revisão antes de salvar." },
      { question: "Ele entende tabelas?", answer: "Sim. O bot foi pensado para receber mensagens e tabelas da rotina da fazenda." },
      { question: "O WhatsApp substitui o painel?", answer: "Não. Ele facilita o registro; o painel continua sendo a visão organizada para gestão." }
    ],
    screenshots: [showcaseItems[7], showcaseItems[0], showcaseItems[4], showcaseItems[3]],
    related: ["software-para-fazenda", "controle-de-rebanho", "financeiro-rural"]
  }
];

export const marketingPaths = ["/", ...solutionPages.map((page) => `/${page.slug}`)];

export function marketingPageBySlug(slug: string) {
  return solutionPages.find((page) => page.slug === slug);
}

export function marketingMetadataFor(page: MarketingPageContent): Metadata {
  return {
    title: page.title,
    description: page.description,
    keywords: Array.from(new Set([...page.keywords, ...SEO_KEYWORDS])),
    alternates: {
      canonical: `/${page.slug}`
    },
    openGraph: {
      title: page.title,
      description: page.description,
      url: `/${page.slug}`,
      siteName: SITE_NAME,
      locale: "pt_BR",
      type: "website",
      images: [
        {
          url: page.heroImage,
          width: 1200,
          height: 630,
          alt: page.heroImageAlt
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
      images: [page.heroImage]
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1
      }
    },
    category: "Agriculture software"
  };
}

export function marketingStructuredData(page?: MarketingPageContent) {
  const url = absoluteSiteUrl(page ? `/${page.slug}` : "/");
  const description = page?.description || LANDING_DESCRIPTION;
  const title = page?.title || LANDING_TITLE;
  const faq = page?.faq || homeFaq;

  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteSiteUrl("/"),
      email: SUPPORT_EMAIL,
      logo: absoluteSiteUrl("/icon.svg"),
      address: {
        "@type": "PostalAddress",
        addressLocality: "João Pessoa",
        addressRegion: "PB",
        addressCountry: "BR"
      },
      founder: founders.map((name) => ({ "@type": "Person", name }))
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: absoluteSiteUrl("/"),
      inLanguage: "pt-BR",
      description: LANDING_DESCRIPTION,
      publisher: {
        "@type": "Organization",
        name: SITE_NAME
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url,
      headline: title,
      description,
      inLanguage: "pt-BR",
      featureList: [
        "Controle de rebanho bovino",
        "Gestão de produção de leite",
        "Controle de estoque rural",
        "Financeiro rural",
        "Gestão de funcionários e ponto",
        "Genealogia e reprodução bovina",
        "Bot de WhatsApp para registros da fazenda"
      ],
      audience: {
        "@type": "Audience",
        audienceType: "Produtores rurais, fazendas de leite e pecuaristas"
      },
      offers: {
        "@type": "Offer",
        availability: "https://schema.org/InStock",
        url: `mailto:${SUPPORT_EMAIL}`
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer
        }
      }))
    }
  ];
}
