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

export const CONTACT_HREF = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Quero conhecer o Rancho")}&body=${encodeURIComponent("Olá, gostaria de solicitar uma demonstração do Rancho.\n\nNome:\nFazenda:\nTelefone:")}`;

export const founders = ["Lucas Todaro", "Henrique Guimarães"];
export const companyLocation = "João Pessoa, Paraíba";

export const trustSignals = [
  "Projeto criado em João Pessoa/PB",
  "Feito por Lucas Todaro e Henrique Guimarães",
  "Contato direto: projeto.fazenda00@gmail.com"
];

export const showcaseItems: MarketingScreenshot[] = [
  { name: "Dashboard", detail: "Indicadores gerais", image: "/landing/screenshots/dashboard.jpg" },
  { name: "Rebanho", detail: "Animais e ficha individual", image: "/landing/screenshots/rebanho.jpg" },
  { name: "Genealogia", detail: "Árvore familiar dos animais", image: "/landing/screenshots/genealogia.jpg" },
  { name: "Produção", detail: "Ordenhas e destino do leite", image: "/landing/screenshots/producao.jpg" },
  { name: "Estoque", detail: "Entradas, baixas e saldo", image: "/landing/screenshots/estoque.jpg" },
  { name: "Financeiro", detail: "Entradas, saídas e categorias", image: "/landing/screenshots/financeiro.jpg" },
  { name: "Funcionários", detail: "Equipe, convites e ponto", image: "/landing/screenshots/funcionarios.jpg" },
  { name: "WhatsApp", detail: "Bot e números autorizados", image: "/landing/screenshots/whatsapp.jpg" },
  { name: "Configurações", detail: "Preferências e dados protegidos", image: "/landing/screenshots/configuracoes.jpg", mask: "settings" }
];

export const homeFeatures: MarketingFeature[] = [
  { icon: "bar-chart", title: "Dashboard geral", description: "Acompanhe produção, estoque, equipe e financeiro em uma visão simples." },
  { icon: "paw", title: "Gestão de rebanho", description: "Organize animais, fases, lotes e histórico individual sem perder contexto." },
  { icon: "droplets", title: "Produção de leite", description: "Registre ordenhas e acompanhe a evolução produtiva da fazenda." },
  { icon: "boxes", title: "Estoque rural", description: "Controle entradas, baixas, unidades e itens críticos com mais previsibilidade." },
  { icon: "wallet", title: "Financeiro rural", description: "Veja receitas, despesas e custos operacionais conectados aos registros." },
  { icon: "users", title: "Funcionários e ponto", description: "Convide a equipe, acompanhe permissões e organize registros de ponto." },
  { icon: "git-fork", title: "Genealogia", description: "Visualize relações familiares e dados importantes dos animais." },
  { icon: "bot", title: "Bot de WhatsApp", description: "Registre dados por mensagem, com interpretação e confirmação antes de salvar." }
];

export const homeExamples: MarketingExample[] = [
  { area: "Produção de leite", text: "B-002 deu 32 litros hoje", result: "Registro de ordenha pronto para confirmar." },
  { area: "Estoque e financeiro", text: "vendi 4 sacos de milho por 320 reais", result: "Baixa no estoque e receita financeira conectadas." },
  { area: "Compra de insumos", text: "comprei 12 sacos de ração por 960 reais", result: "Entrada no estoque e despesa lançadas juntas." },
  { area: "Parto e cria", text: "a vaca B-5 pariu uma bezerra hoje, código B-941", result: "Parto, cria e genealogia preparados." },
  { area: "Saúde animal", text: "apliquei vacina clostridial na B-001 hoje", result: "Evento sanitário com histórico do animal." },
  { area: "Morte de animal", text: "a vaca Estrela morreu hoje", result: "Status do animal atualizado com segurança." },
  { area: "Funcionários", text: "João entrou às 7h e saiu às 17h", result: "Ponto registrado para acompanhamento." },
  { area: "Relatórios", text: "como foi o financeiro desse mês?", result: "Consulta resumida com números do período." }
];

export const homeFaq: MarketingFaq[] = [
  {
    question: "O Rancho serve para controlar rebanho e produção de leite?",
    answer: "Sim. O sistema reúne ficha dos animais, lotes, reprodução, genealogia, ordenhas, produção de leite, estoque, financeiro e relatórios."
  },
  {
    question: "Consigo registrar dados da fazenda pelo WhatsApp?",
    answer: "Sim. A equipe pode enviar mensagens simples para o bot, revisar a confirmação e salvar o registro no módulo correto do Rancho."
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
    heroTitle: "Controle a fazenda com dados organizados e menos retrabalho.",
    heroText: "O Rancho reúne rebanho, leite, estoque, financeiro, equipe e WhatsApp em uma plataforma web feita para a rotina de quem precisa decidir rápido.",
    heroImage: "/landing/screenshots/dashboard.jpg",
    heroImageAlt: "Dashboard do software para fazenda Rancho",
    primaryCta: "Conhecer o sistema",
    proof: ["Painel único para a operação", "Registros com confirmação", "Acesso web para equipe e gestão"],
    introTitle: "Uma fazenda não precisa depender de caderno, planilha e conversa perdida.",
    introText: "Quando cada área anota de um jeito, o gestor perde histórico, tempo e confiança nos números. O Rancho conecta as rotinas principais para transformar registros simples em acompanhamento real.",
    benefits: [
      { icon: "bar-chart", title: "Visão geral da operação", description: "Veja produção, financeiro, rebanho e estoque sem procurar dados em vários lugares." },
      { icon: "message", title: "Registro pelo WhatsApp", description: "A equipe informa a rotina por mensagem e o sistema organiza antes de salvar." },
      { icon: "shield", title: "Confirmação antes de gravar", description: "O bot mostra o que entendeu para reduzir erro operacional." }
    ],
    workflowTitle: "Como funciona na prática",
    workflow: ["Cadastre a fazenda e a equipe.", "Organize animais, lotes, estoque e financeiro.", "Registre pelo painel ou por mensagens no WhatsApp.", "Acompanhe indicadores, histórico e relatórios."],
    examples: homeExamples.slice(0, 4),
    faq: [
      { question: "Esse software para fazenda funciona para pecuária leiteira?", answer: "Sim. O Rancho cobre produção de leite, rebanho, reprodução, estoque, financeiro e equipe." },
      { question: "Preciso abandonar o WhatsApp da equipe?", answer: "Não. A proposta é justamente aproveitar mensagens simples e transformar em registro organizado." },
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
    heroTitle: "Cada animal com histórico claro, do cadastro aos eventos da vida produtiva.",
    heroText: "Organize brincos, nomes, fases, lotes, status, genealogia, reprodução e ocorrências para saber o que aconteceu com cada animal.",
    heroImage: "/landing/screenshots/rebanho.jpg",
    heroImageAlt: "Tela de controle de rebanho bovino do Rancho",
    primaryCta: "Organizar meu rebanho",
    proof: ["Ficha individual por animal", "Lotes e fases produtivas", "Histórico ligado à reprodução e saúde"],
    introTitle: "O rebanho precisa de histórico, não só de uma lista de nomes.",
    introText: "O Rancho ajuda a acompanhar o animal por código, lote, fase, eventos, partos, tratamentos e relações familiares, mantendo a informação pronta para consulta.",
    benefits: [
      { icon: "paw", title: "Ficha individual", description: "Tenha código, nome, categoria, sexo, raça, lote, peso e status em um só lugar." },
      { icon: "clipboard", title: "Eventos conectados", description: "Vacinas, partos, mortes, observações e manejos ficam no histórico do animal." },
      { icon: "git-fork", title: "Genealogia", description: "Visualize vínculos familiares e descendentes diretos." }
    ],
    workflowTitle: "Como o controle acontece",
    workflow: ["Cadastre animais individualmente ou por tabela.", "Separe por lotes e fases produtivas.", "Registre eventos pelo painel ou WhatsApp.", "Consulte histórico, genealogia e situação atual."],
    examples: [
      { area: "Cadastro", text: "criar vaca Mimosa código B-001 no lote Lactação", result: "Ficha do animal pronta para confirmação." },
      { area: "Lote", text: "troca o lote da B-010 para Bezerros", result: "Alteração de lote preparada com validação." },
      { area: "Consulta", text: "como tá a vaca 090?", result: "Resumo da ficha e dos eventos recentes." }
    ],
    faq: [
      { question: "Dá para importar animais por tabela?", answer: "Sim. O Rancho reconhece tabelas de animais e valida pendências antes de cadastrar." },
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
    heroTitle: "Produção de leite registrada com clareza, por dia e por animal.",
    heroText: "Acompanhe litros, destino do leite, média diária e histórico de produção sem depender de planilhas manuais.",
    heroImage: "/landing/screenshots/producao.jpg",
    heroImageAlt: "Tela de produção de leite do Rancho",
    primaryCta: "Controlar produção",
    proof: ["Litros por período", "Registro por animal", "Relatórios de produção"],
    introTitle: "A ordenha só vira gestão quando os números aparecem com contexto.",
    introText: "O Rancho transforma registros simples de produção em acompanhamento do dia, do mês e dos animais mais importantes para a fazenda.",
    benefits: [
      { icon: "droplets", title: "Litros organizados", description: "Registre produção total, por animal ou por destino." },
      { icon: "bar-chart", title: "Evolução visível", description: "Veja médias e totais para entender a tendência da fazenda." },
      { icon: "message", title: "Entrada rápida", description: "Mensagens simples pelo WhatsApp podem virar registro de ordenha." }
    ],
    workflowTitle: "Rotina simples de controle",
    workflow: ["Registre a produção do dia.", "Informe animal, quantidade e destino quando necessário.", "Confirme antes de salvar.", "Consulte totais e médias por período."],
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
    heroTitle: "Gestão de gado leiteiro com produção, reprodução e histórico unidos.",
    heroText: "Acompanhe vacas em lactação, partos, prenhez, genealogia, ordenha, estoque e financeiro em uma rotina mais conectada.",
    heroImage: "/landing/screenshots/genealogia.jpg",
    heroImageAlt: "Tela de genealogia bovina do Rancho",
    primaryCta: "Ver gestão leiteira",
    proof: ["Lactação e reprodução", "Partos e crias", "Histórico produtivo e sanitário"],
    introTitle: "Na fazenda de leite, produção e reprodução andam juntas.",
    introText: "O Rancho ajuda a relacionar os dados do rebanho com a produção, os eventos reprodutivos, os tratamentos e os custos do dia a dia.",
    benefits: [
      { icon: "droplets", title: "Produção conectada", description: "Acompanhe ordenhas e evolução produtiva junto ao histórico do animal." },
      { icon: "git-fork", title: "Partos e genealogia", description: "Registre partos, crias e vínculos familiares com mais segurança." },
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
    heroTitle: "Receitas, despesas e estoque conversando na mesma rotina.",
    heroText: "Controle vendas, compras, gastos operacionais e resultado da fazenda com lançamentos conectados ao estoque e aos registros do dia.",
    heroImage: "/landing/screenshots/financeiro.jpg",
    heroImageAlt: "Tela de financeiro rural do Rancho",
    primaryCta: "Organizar financeiro",
    proof: ["Entradas e saídas", "Categorias de custo", "Integração com estoque"],
    introTitle: "O financeiro rural fica mais claro quando a rotina operacional alimenta os números.",
    introText: "Ao registrar uma compra, venda ou uso de insumo, o Rancho pode atualizar financeiro e estoque juntos, reduzindo retrabalho e divergência.",
    benefits: [
      { icon: "wallet", title: "Fluxo de caixa", description: "Veja entradas, saídas e saldo por período." },
      { icon: "boxes", title: "Estoque conectado", description: "Compras e vendas podem movimentar produtos e insumos." },
      { icon: "bar-chart", title: "Resumo para decisão", description: "Relatórios ajudam a entender onde a fazenda ganha e gasta." }
    ],
    workflowTitle: "Como os lançamentos entram",
    workflow: ["Registre venda, compra ou despesa.", "O sistema identifica valor, categoria e item relacionado.", "Confirme a ação antes de salvar.", "Consulte resumo financeiro por período."],
    examples: [
      { area: "Venda", text: "vendi 4 sacos de milho por 320 reais", result: "Receita e baixa de estoque conectadas." },
      { area: "Compra", text: "comprei 12 sacos de ração por 960 reais", result: "Despesa e entrada no estoque preparadas." },
      { area: "Consulta", text: "quanto gastei com ração esse mês?", result: "Resumo filtrado por categoria ou item." }
    ],
    faq: [
      { question: "O financeiro conversa com o estoque?", answer: "Sim. O Rancho pode registrar movimentação de estoque e lançamento financeiro na mesma confirmação." },
      { question: "Consigo consultar gastos por período?", answer: "Sim. O bot e o painel ajudam a consultar hoje, mês e outros filtros." },
      { question: "Serve para pequenas fazendas?", answer: "Sim. A proposta é deixar o controle simples para quem precisa sair da planilha." }
    ],
    screenshots: [showcaseItems[5], showcaseItems[4], showcaseItems[0], showcaseItems[7]],
    related: ["software-para-fazenda", "controle-leiteiro", "bot-whatsapp-fazenda"]
  },
  {
    slug: "bot-whatsapp-fazenda",
    title: "Bot de WhatsApp para fazenda",
    description: "Bot de WhatsApp para fazenda registrar produção, estoque, financeiro, partos, vacinas, mortes e consultas no sistema.",
    keywords: ["bot WhatsApp fazenda", "chatbot para fazenda", "WhatsApp agropecuária", "registrar fazenda por WhatsApp"],
    heroLabel: "WhatsApp para fazenda",
    heroTitle: "A equipe registra a rotina pelo WhatsApp. O Rancho organiza no sistema.",
    heroText: "Mensagens simples podem virar registros de produção, estoque, financeiro, rebanho, reprodução, saúde animal e relatórios, sempre com confirmação antes de salvar.",
    heroImage: "/landing/screenshots/whatsapp.jpg",
    heroImageAlt: "Tela do bot de WhatsApp para fazenda no Rancho",
    primaryCta: "Testar o bot",
    proof: ["Interpretação por IA", "Confirmação antes de salvar", "Dados no módulo correto"],
    introTitle: "O melhor registro é aquele que a equipe realmente consegue fazer na hora.",
    introText: "Em vez de obrigar todo mundo a abrir telas, o Rancho permite informar a rotina por mensagem e usa validações do sistema antes de gravar.",
    benefits: [
      { icon: "message", title: "Mensagem natural", description: "O usuário escreve como fala na rotina da fazenda." },
      { icon: "bot", title: "Interpretação inteligente", description: "O bot organiza campos, ações compostas e consultas." },
      { icon: "shield", title: "Segurança antes de salvar", description: "O backend valida e pede confirmação quando a ação altera dados." }
    ],
    workflowTitle: "Fluxo do bot",
    workflow: ["O usuário envia uma mensagem.", "A IA interpreta a intenção e monta a ação.", "O sistema valida dados, permissões e riscos.", "O bot confirma e salva no lugar certo."],
    examples: homeExamples,
    faq: [
      { question: "O bot salva direto sem confirmar?", answer: "Ações que alteram dados passam por confirmação para reduzir erro." },
      { question: "Ele entende tabelas?", answer: "Sim. O bot foi pensado para receber mensagens e tabelas de rotina da fazenda." },
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
