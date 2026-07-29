export const BOT_ROLE_OPTIONS = [
  { value: "funcionario", label: "Funcionário", description: "Rotinas operacionais, sem dados financeiros ou da equipe." },
  { value: "veterinario", label: "Veterinário", description: "Rebanho, reprodução, genealogia, saúde e produção." },
  { value: "contador", label: "Financeiro", description: "Consultas e lançamentos financeiros, sem dados pessoais da equipe." },
  { value: "gerente", label: "Gerente", description: "Gestão operacional e relatórios do rancho." },
  { value: "admin", label: "Administrador", description: "Acesso completo ao bot e às informações do rancho." }
] as const;

export type BotRole = typeof BOT_ROLE_OPTIONS[number]["value"];

const MANAGER_ROLES = new Set<BotRole>(["admin", "gerente"]);
const FINANCE_ROLES = new Set<BotRole>(["admin", "gerente", "contador"]);
const STAFF_DATA_ROLES = new Set<BotRole>(["admin", "gerente"]);

const OPERATIONAL_QUERY_DOMAINS = new Set([
  "fazenda",
  "animais",
  "lotes",
  "genealogia",
  "reproducao",
  "saude_sanitario",
  "producao_leite",
  "estoque",
  "observacoes",
  "agenda_tarefas"
]);

const VETERINARY_QUERY_DOMAINS = new Set([
  "fazenda",
  "animais",
  "lotes",
  "genealogia",
  "reproducao",
  "saude_sanitario",
  "producao_leite",
  "estoque",
  "observacoes",
  "agenda_tarefas"
]);

export function normalizeBotRole(value: unknown): BotRole {
  const role = String(value || "").trim().toLowerCase();
  if (role === "usuario" || role === "bot_only") return "funcionario";
  return BOT_ROLE_OPTIONS.some((option) => option.value === role)
    ? role as BotRole
    : "funcionario";
}

export function botRoleLabel(value: unknown) {
  const role = normalizeBotRole(value);
  return BOT_ROLE_OPTIONS.find((option) => option.value === role)?.label || "Funcionário";
}

export function isBotManager(value: unknown) {
  return MANAGER_ROLES.has(normalizeBotRole(value));
}

export function canAccessBotFinance(value: unknown) {
  return FINANCE_ROLES.has(normalizeBotRole(value));
}

export function canAccessBotStaffData(value: unknown) {
  return STAFF_DATA_ROLES.has(normalizeBotRole(value));
}

export function canQueryBotDomain(value: unknown, domain: string) {
  const role = normalizeBotRole(value);
  if (MANAGER_ROLES.has(role)) return true;
  if (domain === "financeiro") return FINANCE_ROLES.has(role);
  if (domain === "funcionarios" || domain === "ponto_funcionario") return STAFF_DATA_ROLES.has(role);
  if (role === "contador") return ["fazenda", "estoque", "producao_leite"].includes(domain);
  if (role === "veterinario") return VETERINARY_QUERY_DOMAINS.has(domain);
  return OPERATIONAL_QUERY_DOMAINS.has(domain);
}

export function botQueryDeniedMessage(domain: string) {
  if (domain === "financeiro") return "Você não tem permissão para consultar dados financeiros pelo WhatsApp.";
  if (domain === "funcionarios") return "Você não tem permissão para consultar dados da equipe pelo WhatsApp.";
  if (domain === "ponto_funcionario") return "Você não tem permissão para consultar o ponto da equipe pelo WhatsApp.";
  return "Você não tem permissão para consultar essas informações pelo WhatsApp.";
}
