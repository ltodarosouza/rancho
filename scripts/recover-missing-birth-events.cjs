/*
 * Recupera somente os eventos de parto que ficaram sem historico apos uma
 * importacao antiga. Por padrao apenas mostra o que seria inserido.
 * Uso: node scripts/recover-missing-birth-events.cjs [--apply]
 */
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const separator = line.indexOf("=");
  if (separator <= 0 || line.trim().startsWith("#")) continue;
  process.env[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
}

const birthRecordsToRecover = [
  ["080", "101", "2023-04-15"], ["081", "102", "2023-05-02"], ["082", "103", "2023-06-18"],
  ["084", "105", "2023-09-11"], ["086", "107", "2023-11-28"], ["097", "108", "2023-12-16"],
  ["088", "109", "2024-01-08"], ["089", "110", "2024-02-17"], ["080", "111", "2024-03-25"],
  ["081", "112", "2024-04-10"], ["082", "113", "2024-05-29"], ["096", "114", "2024-06-20"],
  ["095", "115", "2024-08-07"], ["088", "201", "2025-01-15"], ["089", "202", "2025-01-30"],
  ["090", "203", "2025-02-12"], ["091", "204", "2025-02-28"], ["092", "205", "2025-03-16"],
  ["093", "206", "2025-04-02"], ["094", "207", "2025-04-18"], ["097", "208", "2025-05-05"],
  ["096", "209", "2025-05-29"], ["098", "210", "2025-06-12"], ["099", "211", "2025-06-28"],
  ["100", "212", "2025-07-10"]
].map(([motherCode, childCode, date]) => ({ motherCode, childCode, date }));
const childCodesToRecover = birthRecordsToRecover.map((record) => record.childCode);
const motherCodesToRecover = [...new Set(birthRecordsToRecover.map((record) => record.motherCode))];

function brazilianMidday(date) {
  return `${date}T12:00:00.000Z`;
}

async function farmForTodaro(supabase) {
  const { data, error } = await supabase
    .from("whatsapp_usuarios")
    .select("fazenda_id,telefone_e164,nome_exibicao,papel_bot,ativo")
    .eq("ativo", true);
  if (error) throw error;

  const owner = (data || []).find((user) =>
    String(user.telefone_e164 || "").replace(/\D/g, "").endsWith("83996732761")
  ) || (data || []).find((user) =>
    String(user.nome_exibicao || "").toLowerCase().includes("todaro") && user.papel_bot === "admin"
  );
  if (!owner?.fazenda_id) throw new Error("Nao encontrei o Rancho Todaro entre os usuarios ativos do WhatsApp.");
  return owner.fazenda_id;
}

async function main() {
  const apply = process.argv.includes("--apply");
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("As credenciais do Supabase nao estao configuradas em .env.local.");
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const fazendaId = await farmForTodaro(supabase);
  const [{ data: children, error: childrenError }, { data: mothers, error: mothersError }, { data: births, error: birthsError }] = await Promise.all([
    supabase
      .from("animais")
      .select("id,brinco,sexo,mae_id,data_nascimento")
      .eq("fazenda_id", fazendaId)
      .in("brinco", childCodesToRecover),
    supabase
      .from("animais")
      .select("id,brinco")
      .eq("fazenda_id", fazendaId)
      .in("brinco", motherCodesToRecover),
    supabase
      .from("eventos_animal")
      .select("id,animal_id,data_evento,descricao")
      .eq("fazenda_id", fazendaId)
      .eq("tipo", "parto")
  ]);
  if (childrenError) throw childrenError;
  if (mothersError) throw mothersError;
  if (birthsError) throw birthsError;

  const byCode = new Map((children || []).map((child) => [String(child.brinco), child]));
  const missingChildren = childCodesToRecover.filter((code) => !byCode.has(code));
  if (missingChildren.length) throw new Error(`Abortado: crias esperadas nao encontradas: ${missingChildren.join(", ")}.`);

  const motherByCode = new Map((mothers || []).map((mother) => [String(mother.brinco), mother]));
  const missingMothers = motherCodesToRecover.filter((code) => !motherByCode.has(code));
  if (missingMothers.length) throw new Error(`Abortado: maes esperadas nao encontradas: ${missingMothers.join(", ")}.`);
  const alreadySaved = new Set((births || []).map((birth) => `${birth.animal_id}|${String(birth.data_evento).slice(0, 10)}`));
  const conflicts = [];
  const rows = birthRecordsToRecover
    .map((record) => ({ record, child: byCode.get(record.childCode), mother: motherByCode.get(record.motherCode) }))
    .filter(({ record, child, mother }) => {
      const matchesChildGenealogy = child.mae_id === mother.id && child.data_nascimento === record.date;
      if (!matchesChildGenealogy) {
        conflicts.push({
          child: record.childCode,
          expectedMother: record.motherCode,
          expectedDate: record.date,
          storedMotherId: child.mae_id,
          storedDate: child.data_nascimento
        });
        return false;
      }
      return !alreadySaved.has(`${mother.id}|${record.date}`);
    })
    .map(({ record, child, mother }) => ({
      fazenda_id: fazendaId,
      animal_id: mother.id,
      tipo: "parto",
      data_evento: brazilianMidday(record.date),
      descricao: `Parto recuperado apos importacao. Cria cadastrada: ${child.brinco}. Sexo da cria: ${child.sexo}.`
    }));

  console.log(JSON.stringify({
    mode: apply ? "apply" : "dry-run",
    expected: childCodesToRecover.length,
    alreadyPresent: childCodesToRecover.length - rows.length - conflicts.length,
    toInsert: rows.length,
    conflicts,
    children: rows.map((row) => ({
      child: String(row.descricao.match(/Cria cadastrada: ([^.]+)/)?.[1] || ""),
      motherId: row.animal_id,
      date: String(row.data_evento).slice(0, 10)
    }))
  }, null, 2));

  if (!apply || !rows.length) return;

  const { data: inserted, error: insertError } = await supabase
    .from("eventos_animal")
    .insert(rows)
    .select("id,animal_id,data_evento,descricao");
  if (insertError) throw insertError;
  if ((inserted || []).length !== rows.length) throw new Error("A insercao nao retornou todos os eventos esperados.");

  console.log(`Recuperacao concluida: ${(inserted || []).length} eventos de parto inseridos.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
