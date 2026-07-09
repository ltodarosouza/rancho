# Rancho

![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?style=for-the-badge&logo=supabase&logoColor=0B3B2E)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)

Rancho is a full-stack agricultural management system built to help farms organize daily operations, centralize records, and turn WhatsApp messages into safe structured actions inside the platform.

The project combines a web dashboard, Supabase persistence, multi-tenant data isolation, and an AI-assisted WhatsApp workflow that can understand natural language messages, tables, and operational updates before saving anything to the database.

> Status: actively evolving as a portfolio and product-oriented project.

## Why This Project Exists

Farm operations often happen through fragmented conversations, spreadsheets, informal notes, and memory. Rancho explores a more practical workflow: the team can manage the operation through a web system while also sending routine updates through WhatsApp, a channel that is already familiar in the field.

The main engineering challenge is not only parsing messages with AI. The important part is making those AI-assisted actions safe: the model can interpret intent, but the backend validates the result and asks for confirmation before any real data is persisted.

## Highlights

- Multi-tenant farm management with Supabase and row-level data isolation.
- Operational dashboard with farm indicators and quick access to core modules.
- Livestock, lots, genealogy, reproduction, health events, and milk production records.
- Inventory control with input and output movements.
- Financial module for revenue, expenses, balance, and reports.
- Employee, payroll, time tracking, and access invitation flows.
- WhatsApp center with internal simulator, message history, and webhook integrations.
- AI-assisted WhatsApp bot using a structured `ActionPlan` contract.
- Confirmation-first workflow before saving real records.
- Automated bot regression tests with mocked AI calls for CI-safe validation.

## Core Modules

| Area | What it manages |
| --- | --- |
| Dashboard | Operational indicators and system overview |
| Livestock | Animals, lots, genealogy, health, reproduction, and production |
| Inventory | Stock items, entries, exits, and operational movements |
| Finance | Revenues, expenses, balances, and reports |
| Staff | Employees, work records, payroll, and invitations |
| WhatsApp | Incoming messages, bot responses, previews, confirmations, and imports |

## WhatsApp + AI Workflow

The WhatsApp bot is designed around a safety boundary: AI interprets the message, but the application owns validation and persistence.

```txt
Incoming WhatsApp message
  -> identify linked user/farm
  -> interpret intent with Gemini
  -> produce a structured ActionPlan
  -> validate the contract locally
  -> show a preview to the user
  -> wait for explicit confirmation
  -> persist validated data in Supabase
  -> send a final response back to WhatsApp
```

This makes the bot useful for natural inputs such as:

```txt
Comprei 4 sacos de ração por 320 reais
```

or table-like messages that need to become structured inventory, finance, staff, production, or animal records.

## Safety Model

Rancho treats AI output as untrusted input.

- No real record should be saved without user confirmation.
- Gemini generates an interpretation, not a database write.
- The backend validates the `ActionPlan` schema and domain rules.
- Server-only secrets stay outside the browser.
- Automated tests use mocks and must not call Gemini live.
- Supabase RLS and tenant identifiers protect farm-level data isolation.

## Tech Stack

| Layer | Tools |
| --- | --- |
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Backend | Next.js App Router APIs, server-side services |
| Database/Auth | Supabase Auth, Postgres, RLS |
| WhatsApp | Twilio Sandbox and Meta WhatsApp Cloud API support |
| AI | Gemini API for message interpretation |
| Quality | TypeScript checks, bot regression scripts, smoke tests |
| Deploy | Vercel-compatible architecture |

## Project Structure

```txt
src/app                    App Router pages, layouts, and API routes
src/components             Reusable UI, layout, marketing, and module components
src/lib                    Shared helpers, types, Supabase clients, and security utilities
src/lib/whatsapp           NLP helpers, providers, contracts, and parser support
src/services               Domain services and integration logic
src/services/whatsapp      Main bot flow, interpreters, consultations, and save handlers
scripts                    Tests, smoke checks, and internal tools
supabase/migrations        Versioned database migrations
supabase/sql               Auxiliary SQL scripts
docs/reports               Technical notes, audits, and historical reports
public                     Public assets
```

## Running Locally

Requirements:

- Node.js compatible with Next.js 14
- npm
- A configured Supabase project
- Environment variables in `.env.local`

Install dependencies:

```bash
npm install
```

Create the local environment file:

```bash
cp .env.example .env.local
```

Start the development server:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Environment Variables

Use `.env.example` as the reference. The main variables are:

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

Only `NEXT_PUBLIC_*` variables are safe to expose to the browser. Service role keys, webhook tokens, WhatsApp credentials, and AI keys must stay server-side.

## Scripts

```bash
npm run dev                  # start the local dev server
npm run build                # create a production build
npm run start                # run the production build
npm run lint                 # run Next.js linting
npm run typecheck            # run TypeScript validation
npm run test                 # typecheck + ActionPlan tests
npm run test:bot             # main WhatsApp bot regression suite
npm run test:bot:gemini      # Gemini-specific bot flow tests
npm run test:bot:heavy       # heavier bot scenarios
npm run smoke:gemini:live    # manual live Gemini smoke test
```

Bot tests are expected to run with mocked AI calls. A healthy automated run should keep live Gemini calls at zero.

## Webhooks

### Twilio Sandbox

```txt
When a message comes in = https://YOUR-DOMAIN/api/twilio/webhook
Method = POST
```

### Meta WhatsApp Cloud API

```txt
https://YOUR-DOMAIN/api/whatsapp/webhook
```

## Database Notes

The system uses real application tables with `fazenda_id` / `rancho_id` fields for tenant-aware data access. The central table-name map lives in:

```txt
src/lib/tables.ts
```

Database changes are versioned under:

```txt
supabase/migrations
```

## Development Principles

- Keep secrets out of Git.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` in client code.
- Do not bypass RLS to fix application flow.
- Keep AI interpretation separate from persistence.
- Confirm destructive or real-world actions before executing them.
- Validate external payloads before insert or update operations.
- Prefer small, traceable commits with clear intent.

## Suggested Checks Before Deploy

```bash
npm run typecheck
npm run test
npm run test:bot
npm run build
```

If the WhatsApp bot changes, also test the internal simulator and run the most relevant bot regression script.

## Roadmap

- Improve production onboarding for new farms.
- Expand reports and operational analytics.
- Add more guided imports for table-like WhatsApp messages.
- Strengthen observability around webhook processing.
- Continue improving bot confirmation, recovery, and error handling flows.

## Author

Built by Lucas Todaro de Souza as a practical full-stack project focused on real-world product thinking, AI-assisted workflows, and secure backend validation.
