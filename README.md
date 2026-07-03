# Rancho

Sistema web para gestao agropecuaria, com foco em operacao de fazendas, controle de rebanho, estoque, financeiro, equipe e automacao por WhatsApp.

O projeto usa Next.js, Supabase e um bot WhatsApp com interpretador Gemini-first para transformar mensagens naturais e tabelas enviadas pelo usuario em acoes seguras no sistema.

## Principais recursos

- Dashboard operacional com indicadores da fazenda.
- Gestao de rebanho, lotes, genealogia, reproducao, eventos e producao de leite.
- Controle de estoque com movimentacoes de entrada e saida.
- Financeiro com receitas, despesas, saldo e relatorios.
- Funcionarios, ponto, folha e convites de acesso.
- Central WhatsApp com simulador interno, webhook Twilio/Meta e historico de mensagens.
- Bot WhatsApp com ActionPlan, confirmacao antes de salvar e importacao de tabelas/listas.
- Fluxo multi-tenant por fazenda/rancho usando Supabase.
- Compatibilidade com deploy na Vercel.

## Stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Supabase Auth, Database e RLS
- Twilio Sandbox / Meta WhatsApp Cloud API
- Gemini API para interpretacao do bot

## Arquitetura do bot WhatsApp

O bot segue um fluxo de execucao seguro:

```txt
Mensagem recebida
  -> identificacao do usuario WhatsApp
  -> interpretacao Gemini ActionPlan
  -> validacao local do contrato
  -> preview e confirmacao
  -> persistencia no Supabase
  -> resposta ao usuario
```

Regras importantes:

- Nenhum registro real deve ser salvo sem confirmacao.
- Gemini interpreta intencao e estrutura, mas o backend valida e executa.
- Testes automatizados usam mocks e nao fazem chamadas live ao Gemini.
- Secrets ficam somente no servidor/Vercel.

## Estrutura do projeto

```txt
src/app                    Rotas do App Router e APIs
src/components             Componentes de layout, UI e modulos
src/lib                    Helpers, tipos, Supabase, seguranca e NLP
src/lib/whatsapp           Contratos, Gemini, ActionPlan e parser auxiliar
src/services               Servicos de dominio e integracoes
src/services/whatsapp      Fluxo principal do bot, consultas e salvamento
scripts                    Testes, smoke tests e ferramentas internas
supabase/migrations        Migrations versionadas
public                     Assets publicos
```

## Requisitos

- Node.js compativel com Next.js 14.
- npm.
- Projeto Supabase configurado.
- Variaveis de ambiente em `.env.local` para desenvolvimento.

## Configuracao local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Depois acesse:

```txt
http://localhost:3000
```

## Variaveis de ambiente

Use `.env.example` como referencia. As principais variaveis sao:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=

SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DEFAULT_FAZENDA_ID=

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=

WHATSAPP_VERIFY_TOKEN=
META_WHATSAPP_TOKEN=
META_PHONE_NUMBER_ID=

BOT_INTERPRETER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
BOT_ALLOW_LEGACY_ROLLBACK=false
```

Variaveis iniciadas com `NEXT_PUBLIC_` podem ir para o navegador. Chaves privadas, tokens de webhook, service role e chaves de IA devem ficar apenas no servidor.

## Scripts

```bash
npm run dev                  # servidor local
npm run build                # build de producao
npm run start                # iniciar build gerado
npm run typecheck            # checagem TypeScript
npm run test                 # typecheck + testes ActionPlan
npm run test:bot             # regressao principal do bot
npm run test:bot:gemini      # testes especificos do fluxo Gemini
npm run smoke:gemini:live    # smoke manual com Gemini live
```

Por padrao, os testes do bot rodam em modo mockado e devem manter `Gemini live calls: 0`.

## Webhooks

### Twilio Sandbox

Configure no Twilio:

```txt
When a message comes in = https://SEU-DOMINIO/api/twilio/webhook
Method = POST
```

### Meta WhatsApp Cloud API

Configure o webhook:

```txt
https://SEU-DOMINIO/api/whatsapp/webhook
```

## Supabase

O sistema usa tabelas reais do app, com `fazenda_id`/`rancho_id` para isolamento de dados. O mapa central de nomes fica em:

```txt
src/lib/tables.ts
```

Migrations versionadas ficam em:

```txt
supabase/migrations
```

Arquivos SQL soltos na raiz devem ser tratados como scripts auxiliares/historicos e revisados antes de execucao.

## Segurança

- Nao commitar `.env`, `.env.local`, tokens ou chaves reais.
- Nao expor `SUPABASE_SERVICE_ROLE_KEY` no frontend.
- Nao desativar RLS para corrigir fluxo de aplicacao.
- Confirmar acoes destrutivas ou persistencia real antes de executar.
- Manter chamadas live de IA fora dos testes automatizados.
- Validar payloads do Gemini no backend antes de qualquer insert/update.

## Qualidade

Antes de abrir PR ou fazer deploy, rode:

```bash
npm run test
npm run test:bot
npm run build
```

Se alterar o bot, priorize tambem smoke manual no simulador da aba WhatsApp.
