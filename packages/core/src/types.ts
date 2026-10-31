export type Won = number;
export type Grams = number;
export type WonPerKg = number;

/** `marketCode` is absent when no public market price exists ("참고 시세 없음"). */
export interface Ingredient {
  id: string;
  name: string;
  spec?: string;
  marketCode?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  memo?: string;
  createdAt: string;
}

/** Unit price a supplier quoted in screen 04. Never an input to any cost calculation. */
export interface Quote {
  id: string;
  supplierId: string;
  ingredientId: string;
  unitPrice: WonPerKg;
  packWeightG: Grams;
  terms?: string;
  date: string;
}

/** Only `confirmed` purchases feed menu cost. */
export interface Purchase {
  id: string;
  ingredientId: string;
  supplierId: string;
  date: string;
  packWeightG: Grams;
  quantity: number;
  amount: Won;
  unitPrice: WonPerKg;
  status: 'confirmed' | 'pending';
  invoiceId?: string;
}

export interface ExtractItem {
  rawName: string;
  packWeightG: Grams | null;
  packUnit: string;
  quantity: number;
  /** Price per pack, as printed on the invoice. */
  unitPrice: Won;
  amount: Won;
  confidence: 'high' | 'low';
  note?: string;
}

export interface ExtractResult {
  supplier: string;
  date: string;
  items: ExtractItem[];
  total: Won;
}

export interface Invoice {
  id: string;
  imageId: string;
  supplierId?: string;
  date?: string;
  status: 'extracted' | 'confirmed';
  extraction: ExtractResult;
  isDemo: boolean;
}

export interface RecipeLine {
  ingredientId: string;
  grams: Grams;
}

export interface Menu {
  id: string;
  name: string;
  price: Won;
  servings: 1;
  recipe: RecipeLine[];
}

export interface MenuCostLine {
  ingredientId: string;
  grams: Grams;
  unitPrice: WonPerKg | null;
  supplierId: string | null;
  cost: Won | null;
  previousCost: Won | null;
}

export interface MenuCost {
  menuId: string;
  /** null when any recipe ingredient has no confirmed purchase. */
  total: Won | null;
  /** total / price, null when total is null. */
  ratio: number | null;
  /** null when total is null or no ingredient has a previous price. */
  previousTotal: Won | null;
  lines: MenuCostLine[];
  /** ingredientIds without a confirmed purchase. */
  missing: string[];
}

export interface CostAlert {
  menuId: string;
  menuName: string;
  delta: Won;
  ingredientIds: string[];
}

/** 4-week indexes, first week = 100. */
export interface MarketIndex {
  mine: number[];
  market: number[];
}
