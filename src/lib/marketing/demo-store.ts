export type DemoAnimal = {
  name: string;
  code: string;
  category: string;
  phase: string;
  sex?: string;
  weight?: number;
  lot?: string;
};

export type DemoTransaction = {
  id: number;
  label: string;
  date: string;
  value: number;
  positive: boolean;
  category?: string;
  method?: string;
};

export type DemoStock = {
  name: string;
  qty: number;
  unit: string;
  min: number;
  category?: string;
  supplier?: string;
};

export type DemoProduction = {
  id: number;
  animal: string;
  liters: number;
  date: string;
  shift?: string;
  destination?: string;
};

export type DemoStockMovement = {
  id: string;
  item: string;
  type: string;
  qty: number;
  unitValue?: number | null;
  reason?: string;
  date: string;
  sourceType?: string | null;
  sourceId?: string | null;
  productionId?: string | null;
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
  stockMovements?: DemoStockMovement[];
  lots?: DemoLot[];
  events?: DemoEvent[];
};

export const INITIAL_DEMO_STORE: DemoStore = {
  animals: [
    { name: "Mimosa", code: "B-001", category: "Vaca", phase: "Lactação", sex: "femea", weight: 480, lot: "Lote A" },
    { name: "Branquinha", code: "V-403", category: "Vaca", phase: "Pré-parto", sex: "femea", weight: 510, lot: "Lote A" },
    { name: "Imperador", code: "T-007", category: "Touro", phase: "Reprodução", sex: "macho", weight: 720, lot: "Lote B" },
    { name: "Aurora", code: "C-396", category: "Bezerra", phase: "Crescimento", sex: "femea", weight: 85, lot: "Lote C" },
    { name: "Estrela", code: "B-012", category: "Vaca", phase: "Lactação", sex: "femea", weight: 465, lot: "Lote A" },
    { name: "Luna", code: "N-401", category: "Novilha", phase: "Recria", sex: "femea", weight: 280, lot: "Lote C" }
  ],
  transactions: [
    { id: 1, label: "Venda de leite", date: "Hoje", value: 1280, positive: true, category: "Venda de leite", method: "Pix" },
    { id: 2, label: "Compra de ração", date: "Ontem", value: 960, positive: false, category: "Alimentação", method: "Boleto" },
    { id: 3, label: "Vacina clostridial", date: "28/07", value: 180, positive: false, category: "Medicamento", method: "Cartão" },
    { id: 4, label: "Venda de bezerro", date: "25/07", value: 3200, positive: true, category: "Venda de animal", method: "Pix" },
    { id: 5, label: "Sal mineral", date: "22/07", value: 240, positive: false, category: "Alimentação", method: "Dinheiro" }
  ],
  stock: [
    { name: "Ração bovina", qty: 45, unit: "sacos", min: 10, category: "Ração", supplier: "Agro Sul" },
    { name: "Sal mineral", qty: 12, unit: "pacotes", min: 5, category: "Ração", supplier: "Nutrimais" },
    { name: "Vacina clostridial", qty: 8, unit: "doses", min: 3, category: "Medicamento", supplier: "Vetbrás" },
    { name: "Vermífugo", qty: 15, unit: "doses", min: 5, category: "Medicamento", supplier: "Vetbrás" }
  ],
  production: [
    { id: 1, animal: "Mimosa (B-001)", liters: 28, date: "Hoje", shift: "manhã", destination: "tanque" },
    { id: 2, animal: "Estrela (B-012)", liters: 31, date: "Hoje", shift: "manhã", destination: "tanque" }
  ],
  stockMovements: []
};

export function cloneDemoStore(): DemoStore {
  return JSON.parse(JSON.stringify(INITIAL_DEMO_STORE)) as DemoStore;
}
