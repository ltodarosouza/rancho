export type DemoAnimal = {
  name: string;
  code: string;
  category: string;
  phase: string;
};

export type DemoTransaction = {
  id: number;
  label: string;
  date: string;
  value: number;
  positive: boolean;
};

export type DemoStock = {
  name: string;
  qty: number;
  unit: string;
  min: number;
};

export type DemoProduction = {
  id: number;
  animal: string;
  liters: number;
  date: string;
};

export type DemoLot = {
  id: string;
  name: string;
  description?: string;
  active?: boolean;
};

export type DemoEvent = {
  id: string;
  animal: string;
  type: string;
  date: string;
  notes?: string;
};

export type DemoStore = {
  animals: DemoAnimal[];
  transactions: DemoTransaction[];
  stock: DemoStock[];
  production: DemoProduction[];
  lots?: DemoLot[];
  events?: DemoEvent[];
};

export const INITIAL_DEMO_STORE: DemoStore = {
  animals: [
    { name: "Mimosa", code: "B-001", category: "Vaca", phase: "Lactação" },
    { name: "Branquinha", code: "V-403", category: "Vaca", phase: "Pré-parto" },
    { name: "Imperador", code: "T-007", category: "Touro", phase: "Reprodução" },
    { name: "Aurora", code: "C-396", category: "Bezerra", phase: "Crescimento" },
    { name: "Estrela", code: "B-012", category: "Vaca", phase: "Lactação" },
    { name: "Luna", code: "N-401", category: "Novilha", phase: "Recria" }
  ],
  transactions: [
    { id: 1, label: "Venda de leite", date: "Hoje", value: 1280, positive: true },
    { id: 2, label: "Compra de ração", date: "Ontem", value: 960, positive: false },
    { id: 3, label: "Vacina clostridial", date: "28/07", value: 180, positive: false },
    { id: 4, label: "Venda de bezerro", date: "25/07", value: 3200, positive: true },
    { id: 5, label: "Sal mineral", date: "22/07", value: 240, positive: false }
  ],
  stock: [
    { name: "Ração bovina", qty: 45, unit: "sacos", min: 10 },
    { name: "Sal mineral", qty: 12, unit: "pacotes", min: 5 },
    { name: "Vacina clostridial", qty: 8, unit: "doses", min: 3 },
    { name: "Vermífugo", qty: 15, unit: "doses", min: 5 }
  ],
  production: [
    { id: 1, animal: "Mimosa (B-001)", liters: 28, date: "Hoje" },
    { id: 2, animal: "Estrela (B-012)", liters: 31, date: "Hoje" }
  ]
};

export function cloneDemoStore(): DemoStore {
  return JSON.parse(JSON.stringify(INITIAL_DEMO_STORE)) as DemoStore;
}
