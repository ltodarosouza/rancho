const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "test-data", "fazenda-coerente-2026-07-31");
const START = "2020-01-05";
const END = "2026-07-31";
const MAX_ROWS_PER_IMPORT = 120;

const cows = {
  "080": { name: "Canela", breed: "Girolando", birth: "2020-05-02" },
  "081": { name: "Estrela", breed: "Girolando", birth: "2020-06-18" },
  "082": { name: "Jade", breed: "Girolando", birth: "2019-09-10" },
  "083": { name: "Aurora", breed: "Holandesa", birth: "2020-01-28" },
  "084": { name: "Lua", breed: "Girolando", birth: "2019-07-17" },
  "085": { name: "Brisa", breed: "Jersey", birth: "2019-12-09" },
  "086": { name: "Cristal", breed: "Girolando", birth: "2020-02-25" },
  "087": { name: "Serena", breed: "Holandesa", birth: "2019-10-14" },
  "088": { name: "Safira", breed: "Girolando", birth: "2020-08-06" },
  "089": { name: "Nuvem", breed: "Girolando", birth: "2020-04-19" },
  "090": { name: "Mimosa", breed: "Girolando", birth: "2019-08-18" },
  "091": { name: "Perola", breed: "Holandesa", birth: "2020-03-12" },
  "092": { name: "Flor", breed: "Girolando", birth: "2020-06-30" },
  "093": { name: "Bela", breed: "Girolando", birth: "2020-02-02" },
  "094": { name: "Amora", breed: "Jersey", birth: "2020-05-26" },
  "095": { name: "Iris", breed: "Holandesa", birth: "2019-11-11" },
  "096": { name: "Mel", breed: "Girolando", birth: "2020-09-01" },
  "097": { name: "Dalia", breed: "Girolando", birth: "2019-12-15" },
  "098": { name: "Luna", breed: "Holandesa", birth: "2020-01-20" },
  "099": { name: "Magnolia", breed: "Girolando", birth: "2019-07-13" },
  "100": { name: "Rubi", breed: "Girolando", birth: "2020-05-21" }
};

const bulls = ["T-001", "T-002", "T-003", "T-004", "T-005"];

const young = [
  ["101", "2023-04-15"], ["102", "2023-05-02"], ["103", "2023-06-18"], ["104", "2023-08-22"],
  ["105", "2023-09-11"], ["106", "2023-10-04"], ["107", "2023-11-28"], ["108", "2023-12-16"],
  ["109", "2024-01-08"], ["110", "2024-02-17"], ["111", "2024-03-25"], ["112", "2024-04-10"],
  ["113", "2024-05-29"], ["114", "2024-06-20"], ["115", "2024-08-07"],
  ["201", "2025-01-15"], ["202", "2025-01-30"], ["203", "2025-02-12"], ["204", "2025-02-28"],
  ["205", "2025-03-16"], ["206", "2025-04-02"], ["207", "2025-04-18"], ["208", "2025-05-05"],
  ["209", "2025-05-29"], ["210", "2025-06-12"], ["211", "2025-06-28"], ["212", "2025-07-10"],
  ["301", "2026-01-12"], ["302", "2026-01-25"], ["303", "2026-02-08"], ["304", "2026-02-21"],
  ["305", "2026-03-05"], ["306", "2026-03-19"], ["307", "2026-04-02"], ["308", "2026-04-18"],
  ["309", "2026-05-03"], ["310", "2026-05-17"], ["311", "2026-06-01"], ["312", "2026-06-15"],
  ["313", "2026-06-29"], ["314", "2026-07-10"], ["315", "2026-07-24"]
].map(([code, birth]) => ({ code, birth }));

// Cada cria da base existente ganha pais cadastrados. As maes foram distribuidas
// para produzir historicos com 0, 1, 2 e 3 partos, sem intervalos impossiveis.
const mothersByChild = [
  "080", "081", "082", "083", "084", "085", "086", "097",
  "088", "089", "080", "081", "082", "096", "095",
  "088", "089", "090", "091", "092", "093", "094", "097", "096", "098", "099", "100",
  "088", "089", "090", "091", "092", "093", "094", "097", "096", "098", "099", "100", "080", "081", "082"
];

function date(value) {
  return new Date(`${value}T12:00:00Z`);
}

function iso(value) {
  return date(value).toISOString().slice(0, 10);
}

function addDays(value, amount) {
  const result = date(value);
  result.setUTCDate(result.getUTCDate() + amount);
  return result.toISOString().slice(0, 10);
}

function daysBetween(left, right) {
  return Math.round((date(right).getTime() - date(left).getTime()) / 86400000);
}

function assert(condition, message) {
  if (!condition) throw new Error(`Base incoerente: ${message}`);
}

function csv(rows) {
  return rows.map((row) => row.map((value) => String(value ?? "").replace(/[\r\n;]/g, " ")).join(";")).join("\r\n") + "\r\n";
}

function writeCsv(name, header, rows) {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, name), csv([header, ...rows]), "utf8");
}

function writeBatches(prefix, header, rows) {
  const chunks = [];
  for (let index = 0; index < rows.length; index += MAX_ROWS_PER_IMPORT) {
    const chunk = rows.slice(index, index + MAX_ROWS_PER_IMPORT);
    const suffix = String(chunks.length + 1).padStart(2, "0");
    writeCsv(`${prefix}-${suffix}.csv`, header, chunk);
    chunks.push(chunk);
  }
  return chunks.length;
}

const births = young.map((child, index) => ({
  child: child.code,
  date: child.birth,
  mother: mothersByChild[index],
  father: index === young.length - 1 ? "T-001" : bulls[index % bulls.length],
  retry: [2, 6, 11, 15, 18, 22, 25, 30, 34, 38].includes(index),
  secondRetry: index === 6
})).sort((left, right) => left.date.localeCompare(right.date));

function validatePlan() {
  assert(births.length === young.length, "cada cria existente deve ter um parto correspondente");
  const byMother = new Map();
  for (const birth of births) {
    assert(cows[birth.mother], `mae ${birth.mother} inexistente`);
    assert(bulls.includes(birth.father), `pai ${birth.father} inexistente`);
    assert(birth.date >= START && birth.date <= END, `parto de ${birth.child} fora do periodo`);
    assert(daysBetween(cows[birth.mother].birth, birth.date) >= 730, `mae ${birth.mother} pariu antes da idade minima`);
    byMother.set(birth.mother, [...(byMother.get(birth.mother) || []), birth]);
  }

  for (const [mother, motherBirths] of byMother.entries()) {
    motherBirths.sort((left, right) => left.date.localeCompare(right.date));
    for (let index = 1; index < motherBirths.length; index += 1) {
      const interval = daysBetween(motherBirths[index - 1].date, motherBirths[index].date);
      assert(interval >= 335, `${mother} possui intervalo de parto biologicamente curto (${interval} dias)`);
    }
  }
  assert(!byMother.has("087"), "Serena deve permanecer sem parto para cobrir o cenario de vaca que nunca pariu");
}

function buildReproduction() {
  const protocols = [];
  const inseminations = [];
  const retests = [];
  const pregnancies = [];
  const preBirths = [];
  const birthsRows = [];

  for (const birth of births) {
    const successfulIa = addDays(birth.date, -284);
    protocols.push([birth.mother, "protocolo", addDays(successfulIa, -9), `Ciclo que resultou no parto da cria ${birth.child}`]);

    if (birth.retry) {
      const failedIa = addDays(successfulIa, -68);
      protocols.push([birth.mother, "protocolo", addDays(failedIa, -9), "Protocolo para primeira tentativa de IA"]);
      inseminations.push([birth.mother, "inseminacao", failedIa, "Primeira IA sem confirmacao de prenhez"]);
      retests.push([birth.mother, "reteste", addDays(failedIa, 31), "Reteste negativo; preparar nova IA"]);
      if (birth.secondRetry) {
        const secondFailedIa = addDays(successfulIa, -36);
        protocols.push([birth.mother, "protocolo", addDays(secondFailedIa, -8), "Segundo protocolo apos novo reteste"]);
        inseminations.push([birth.mother, "inseminacao", secondFailedIa, "Segunda IA sem confirmacao de prenhez"]);
        retests.push([birth.mother, "reteste", addDays(secondFailedIa, 27), "Segundo reteste negativo"]);
      }
    }

    inseminations.push([birth.mother, "inseminacao", successfulIa, `IA confirmada; reprodutor ${birth.father}`]);
    pregnancies.push([birth.mother, "prenhez", addDays(successfulIa, 32), `Prenhez confirmada; pai previsto ${birth.father}`]);
    preBirths.push([birth.mother, "pre_parto", addDays(birth.date, -21), `Preparo para o parto da cria ${birth.child}`]);
    birthsRows.push([birth.mother, "parto", birth.date, `Parto registrado; cria ${birth.child} vinculada na tabela de genealogia`]);
  }

  const currentCycles = [
    ["083", "protocolo", "2025-11-12", "Protocolo atual"],
    ["083", "inseminacao", "2025-11-21", "IA atual"],
    ["083", "prenhez", "2025-12-23", "Prenhez atual confirmada"],
    ["084", "protocolo", "2025-12-05", "Protocolo atual"],
    ["084", "inseminacao", "2025-12-15", "IA atual"],
    ["084", "prenhez", "2026-01-15", "Prenhez atual confirmada"],
    ["085", "protocolo", "2026-07-22", "Em protocolo ao fim da base"],
    ["086", "protocolo", "2026-05-26", "Protocolo atual"],
    ["086", "inseminacao", "2026-06-05", "IA aguardando reteste"],
    ["086", "reteste", "2026-07-07", "Em reteste ao fim da base"],
    ["090", "protocolo", "2026-07-20", "Novo protocolo apos parto"],
    ["094", "protocolo", "2026-07-24", "Novo protocolo apos parto"],
    ["095", "protocolo", "2026-05-20", "Protocolo atual"],
    ["095", "inseminacao", "2026-05-30", "IA aguardando reteste"],
    ["095", "reteste", "2026-07-01", "Em reteste ao fim da base"]
  ];

  for (const [animal, event, eventDate, notes] of currentCycles) {
    if (event === "protocolo") protocols.push([animal, event, eventDate, notes]);
    if (event === "inseminacao") inseminations.push([animal, event, eventDate, notes]);
    if (event === "reteste") retests.push([animal, event, eventDate, notes]);
    if (event === "prenhez") pregnancies.push([animal, event, eventDate, notes]);
  }

  const sortRows = (rows) => rows.sort((left, right) => String(left[2]).localeCompare(String(right[2])));
  return {
    protocols: sortRows(protocols),
    inseminations: sortRows(inseminations),
    retests: sortRows(retests),
    pregnancies: sortRows(pregnancies),
    preBirths: sortRows(preBirths),
    births: sortRows(birthsRows)
  };
}

function buildProduction() {
  const byMother = new Map();
  for (const birth of births) byMother.set(birth.mother, [...(byMother.get(birth.mother) || []), birth]);

  const rows = [];
  for (const [mother, motherBirths] of byMother.entries()) {
    const ordered = motherBirths.sort((left, right) => left.date.localeCompare(right.date));
    for (let index = 0; index < ordered.length; index += 1) {
      const lactationStart = addDays(ordered[index].date, 5);
      const nextBirth = ordered[index + 1]?.date || null;
      const dryOff = addDays(ordered[index].date, 305);
      const finalDate = [END, dryOff, nextBirth ? addDays(nextBirth, -60) : END].sort()[0];
      const breed = cows[mother].breed;
      const base = breed === "Holandesa" ? 31 : breed === "Jersey" ? 19 : 25;
      let current = lactationStart;
      let sample = 0;
      while (current <= finalDate) {
        const lactationDay = daysBetween(ordered[index].date, current);
        const growth = lactationDay < 55 ? 0.72 + lactationDay * 0.005 : 1;
        const decline = Math.max(0, lactationDay - 90) * 0.00115;
        const variation = ((Number(mother) + sample * 7 + index * 3) % 9 - 4) * 0.28;
        const liters = Math.max(8, base * growth * (1 - decline) + variation).toFixed(1).replace(".", ",");
        rows.push([mother, liters, current, sample % 2 ? "tarde" : "manha", `Lactacao iniciada no parto de ${ordered[index].child}`]);
        current = addDays(current, 9);
        sample += 1;
      }
    }
  }
  return rows.sort((left, right) => String(left[2]).localeCompare(String(right[2])) || String(left[0]).localeCompare(String(right[0])));
}

function buildHealth() {
  const animalBirthDates = {
    ...Object.fromEntries(Object.entries(cows).map(([code, animal]) => [code, animal.birth])),
    "T-001": "2017-03-15", "T-002": "2018-08-18", "T-003": "2019-05-05", "T-004": "2018-11-22", "T-005": "2020-01-09",
    ...Object.fromEntries(young.map((animal) => [animal.code, animal.birth]))
  };
  const campaigns = [
    ["2025-04-15", "Vacina clostridial", "5 ml", "18", "Campanha sanitaria anual"],
    ["2025-10-20", "Vermifugo", "10 ml", "12", "Controle estrategico de parasitas"],
    ["2026-04-30", "Vacina clostridial", "5 ml", "18", "Campanha sanitaria anual"],
    ["2026-07-25", "Vacina contra brucelose", "2 ml", "22", "Reforco sanitario do rebanho"]
  ];
  const rows = [];
  for (const [eventDate, medicine, dose, cost, notes] of campaigns) {
    for (const [animal, birth] of Object.entries(animalBirthDates)) {
      if (birth <= eventDate) rows.push([animal, "vacina", eventDate, medicine, dose, cost, notes]);
    }
  }
  return rows.sort((left, right) => String(left[2]).localeCompare(String(right[2])) || String(left[0]).localeCompare(String(right[0])));
}

function buildFinance() {
  const rows = [];
  for (let year = 2025; year <= 2026; year += 1) {
    const lastMonth = year === 2026 ? 7 : 12;
    for (let month = 1; month <= lastMonth; month += 1) {
      const monthText = `${year}-${String(month).padStart(2, "0")}`;
      const seasonality = month >= 5 && month <= 9 ? 1.08 : 0.96;
      const revenue = Math.round((13200 + (month % 4) * 750 + (year - 2025) * 650) * seasonality);
      rows.push([`Venda de leite - ${monthText}`, "receita", revenue, `${monthText}-05`, "Venda mensal de leite"]);
      rows.push([`Compra de racao - ${monthText}`, "despesa", Math.round(revenue * 0.31), `${monthText}-08`, "Alimentacao do rebanho"]);
      rows.push([`Energia e ordenha - ${monthText}`, "despesa", Math.round(820 * seasonality), `${monthText}-12`, "Energia da ordenha e refrigeracao"]);
      rows.push([`Folha de pagamento - ${monthText}`, "despesa", 11300, `${monthText}-20`, "Equipe da fazenda"]);
      rows.push([`Sanidade do rebanho - ${monthText}`, "despesa", 420 + (month % 3) * 95, `${monthText}-26`, "Vacinas e medicamentos"]);
    }
  }
  return rows;
}

function run() {
  validatePlan();
  const reproduction = buildReproduction();
  const production = buildProduction();
  const health = buildHealth();
  const finance = buildFinance();

  writeCsv("01-lotes.csv", ["Nome", "Capacidade", "Descricao", "Ativo"], [
    ["Lactação", 30, "Vacas em produção de leite", "sim"],
    ["Reprodutores", 10, "Touros e manejo reprodutivo", "sim"],
    ["Novilhas", 20, "Novilhas em crescimento", "sim"],
    ["Recria", 20, "Animais jovens em recria", "sim"],
    ["Bezerros", 30, "Bezerros e bezerras", "sim"]
  ]);
  writeCsv("02-genealogia.csv", ["animal", "pai", "mae"], births.map((birth) => [birth.child, birth.father, birth.mother]));
  writeCsv("03-protocolos.csv", ["Animal", "Evento", "Data", "Observacoes"], reproduction.protocols);
  writeCsv("04-inseminacoes.csv", ["Animal", "Evento", "Data", "Observacoes"], reproduction.inseminations);
  writeCsv("05-retestes.csv", ["Animal", "Evento", "Data", "Observacoes"], reproduction.retests);
  writeCsv("06-prenhezes.csv", ["Animal", "Evento", "Data", "Observacoes"], reproduction.pregnancies);
  writeCsv("07-pre-partos.csv", ["Animal", "Evento", "Data", "Observacoes"], reproduction.preBirths);
  writeCsv("08-partos.csv", ["Animal", "Evento", "Data", "Observacoes"], reproduction.births);
  const healthBatches = writeBatches("09-eventos-medicos", ["Animal", "Evento", "Data", "Medicamento", "Dose", "Custo", "Observacoes"], health);
  const productionBatches = writeBatches("10-producao", ["Animal", "Litros", "Data", "Turno", "Observacoes"], production);
  writeCsv("11-financeiro.csv", ["Descricao", "Tipo", "Valor", "Data", "Observacoes"], finance);
  writeCsv("12-funcionarios.csv", ["Nome", "Funcao", "WhatsApp", "Data admissao", "Salario", "Papel bot", "Ativo"], [
    ["Joao Batista", "Vaqueiro", "+5583999990001", "2021-02-10", 2100, "funcionario", "sim"],
    ["Maria Clara", "Ordenhadora", "+5583999990002", "2021-06-01", 2200, "funcionario", "sim"],
    ["Ana Ribeiro", "Administradora", "+5583999990003", "2022-01-15", 3800, "gerente", "sim"],
    ["Carlos Mendes", "Medico veterinario", "+5583999990004", "2023-03-20", 4500, "veterinario", "sim"]
  ]);

  assert(production.length >= 1000, `producao insuficiente (${production.length} linhas; esperado ao menos 1000)`);
  for (const birth of births) {
    const hasProtocol = reproduction.protocols.some((row) => row[0] === birth.mother && row[2] < birth.date);
    const hasConfirmedPregnancy = reproduction.pregnancies.some((row) => row[0] === birth.mother && row[2] < birth.date);
    const hasPreBirth = reproduction.preBirths.some((row) => row[0] === birth.mother && row[2] < birth.date);
    const hasSuccessfulIa = reproduction.inseminations.some((row) => row[0] === birth.mother && row[2] === addDays(birth.date, -284));
    assert(hasProtocol && hasSuccessfulIa && hasConfirmedPregnancy && hasPreBirth, `ciclo incompleto antes do parto da cria ${birth.child}`);
  }
  assert(reproduction.pregnancies.some((row) => row[0] === "083"), "Aurora deve permanecer prenha no recorte atual");
  assert(reproduction.pregnancies.some((row) => row[0] === "084"), "Lua deve permanecer prenha no recorte atual");
  assert(reproduction.protocols.some((row) => row[0] === "085"), "Brisa deve permanecer em protocolo no recorte atual");
  assert(reproduction.retests.some((row) => row[0] === "086"), "Cristal deve permanecer em reteste no recorte atual");
  const datedRows = [
    ...reproduction.protocols,
    ...reproduction.inseminations,
    ...reproduction.retests,
    ...reproduction.pregnancies,
    ...reproduction.preBirths,
    ...reproduction.births,
    ...production,
    ...health,
    ...finance.map((row) => [row[0], row[1], row[3]])
  ];
  for (const row of datedRows) {
    const eventDate = String(row[2]);
    assert(eventDate >= START && eventDate <= END, `evento fora do intervalo: ${eventDate}`);
  }

  const summary = {
    births: births.length,
    protocols: reproduction.protocols.length,
    inseminations: reproduction.inseminations.length,
    retests: reproduction.retests.length,
    pregnancies: reproduction.pregnancies.length,
    preBirths: reproduction.preBirths.length,
    production: production.length,
    health: health.length,
    finance: finance.length,
    productionBatches,
    healthBatches
  };
  console.log(`Base coerente criada em ${outputDir}`);
  console.log(JSON.stringify(summary, null, 2));
}

run();
