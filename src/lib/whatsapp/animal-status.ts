import type { AnyRecord } from "@/lib/types";
import { normalizeRanchoText } from "@/lib/whatsapp/nlp";

/**
 * Status que impedem novas movimentacoes do animal. Comparado por prefixo de
 * proposito: o cadastro aceita variacao de genero e sinonimo, e a lista de
 * palavras exatas que existia aqui deixava passar "vendido" e "morta". Deixar
 * passar significa gravar producao de animal que nao esta mais no rebanho.
 */
const BLOCKED_STATUS_PREFIXES = ["mort", "inativ", "vendid", "excluid", "descartad", "abatid", "baixad"];

export function animalStatusValue(animal: AnyRecord | null | undefined) {
  return normalizeRanchoText(String(animal?.status || ""));
}

export function animalDeathDate(animal: AnyRecord | null | undefined) {
  return String(animal?.died_at || animal?.death_date || animal?.data_morte || "").slice(0, 10);
}

export function isAnimalInactiveForBot(animal: AnyRecord | null | undefined) {
  const status = animalStatusValue(animal);
  if (!status || status.startsWith("ativ")) return false;
  return BLOCKED_STATUS_PREFIXES.some((prefix) => status.startsWith(prefix));
}

/** Status em texto para a frase, sem inventar rotulo que nao existe. */
export function animalStatusLabel(animal: AnyRecord | null | undefined) {
  const status = animalStatusValue(animal);
  if (status.startsWith("mort")) return "morta";
  if (status.startsWith("vendid")) return "vendida";
  if (status.startsWith("inativ")) return "inativa";
  if (status.startsWith("excluid")) return "excluida";
  if (status.startsWith("descartad")) return "descartada";
  if (status.startsWith("abatid")) return "abatida";
  if (status.startsWith("baixad")) return "com baixa";
  return status || "fora do rebanho";
}

export function animalActionLabel(intent: string) {
  if (intent === "PRODUCAO_LEITE") return "produção";
  if (intent === "VACINA_MEDICAMENTO") return "vacina ou medicamento";
  if (intent === "PARTO") return "parto";
  if (intent === "MORTE") return "morte";
  return "novas movimentações";
}

function animalName(animal: AnyRecord | null | undefined) {
  const nome = String(animal?.nome || "").trim();
  const brinco = String(animal?.brinco || "").trim();
  if (nome && brinco) return `${nome} (${brinco})`;
  return nome || brinco || "Esse animal";
}

/**
 * Bloqueia e explica o estado. Nao oferece um "sim" que reativaria o animal
 * junto com o registro: seriam duas gravacoes a partir de uma palavra so, e
 * reativar por engano um animal vendido ou morto e pior do que pedir ao
 * usuario que repita a intencao com todas as letras.
 */
export function animalBlockedMessage(animal: AnyRecord, intent: string) {
  const label = animalName(animal);
  const shortLabel = label.replace(/\s*\(.*\)$/, "");
  const status = animalStatusLabel(animal);
  const date = animalDeathDate(animal);
  const desde = date ? ` desde ${date}` : "";

  if (intent === "MORTE") {
    return `${label} já está marcada como ${status}${desde}, então não registro a morte de novo.`;
  }

  return [
    `${label} está marcada como ${status}${desde} no rebanho, então não posso registrar ${animalActionLabel(intent)} para ela.`,
    "",
    "O que dá para fazer:",
    `- Se ela voltou ao rebanho, me mande: reativar ${shortLabel}`,
    "- Se era outro animal, me mande o brinco correto",
    "- Se não era para registrar nada, é só ignorar esta mensagem"
  ].join("\n");
}
