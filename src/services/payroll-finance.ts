"use client";

import { createRecord, deleteRecord, listRecords, updateRecord } from "@/services/crud";
import { TABLES } from "@/lib/tables";
import type { DataContext } from "@/lib/types";
import { getRanchTodayISO } from "@/lib/dates/ranch-time";

function currentMonthKey() {
  return getRanchTodayISO().slice(0, 7);
}

function payrollOrigem(month: string) {
  return `folha_salarial:${month}`;
}

export async function syncMonthlyPayrollTransaction(context: DataContext) {
  if (!context.fazendaId) return;

  const month = currentMonthKey();
  const origem = payrollOrigem(month);

  const [employees, existing] = await Promise.all([
    listRecords(TABLES.funcionarios, {
      ...context,
      select: "id,ativo,deleted_at,salario_base"
    }),
    listRecords(TABLES.transacoesFinanceiras, {
      ...context,
      select: "id,valor",
      filters: [{ column: "origem", value: origem }]
    })
  ]);

  const active = employees.filter((e) => e.ativo !== false && !e.deleted_at);
  const total = active.reduce((sum, e) => sum + Number(e.salario_base ?? 0), 0);

  if (total <= 0) {
    for (const row of existing) {
      await deleteRecord(TABLES.transacoesFinanceiras, row.id, context);
    }
    return;
  }

  const payload = {
    tipo: "saida",
    data_transacao: `${month}-01`,
    valor: total,
    categoria: "Folha salarial",
    descricao: `Folha salarial — ${active.length} funcionário${active.length !== 1 ? "s" : ""}`,
    metodo_pagamento: "Folha salarial",
    origem
  };

  if (existing[0]?.id) {
    if (Number(existing[0].valor) !== total) {
      await updateRecord(TABLES.transacoesFinanceiras, existing[0].id, payload, context);
    }
    for (const dup of existing.slice(1)) {
      await deleteRecord(TABLES.transacoesFinanceiras, dup.id, context);
    }
  } else {
    await createRecord(TABLES.transacoesFinanceiras, payload, context);
  }
}
