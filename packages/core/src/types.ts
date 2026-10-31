/** Integer Korean won. Unit prices per base unit remain unrounded numbers. */
export type Won = number;
export type Unit = 'g' | 'kg' | 'mL' | 'L' | 'ea';
export type BaseUnit = 'g' | 'mL' | 'ea';

export interface Ingredient {
  id: string;
  name: string;
  spec?: string;
  baseUnit: BaseUnit;
  marketCode?: string;
  aliases: string[];
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  memo?: string;
  createdAt: string;
}

/** Quotes never feed purchase-based cost calculations. */
export interface Quote {
  id: string;
  supplierId: string;
  ingredientId: string;
  packSize: number;
  packUnit: Unit;
  price: Won;
  terms?: string;
  date: string;
}

export interface Purchase {
  id: string;
  ingredientId: string;
  supplierId: string;
  /** YYYY-MM-DD */
  date: string;
  packSize: number;
  packUnit: Unit;
  quantity: number;
  amount: Won;
  status: 'confirmed';
  source: 'receipt' | 'manual' | 'order';
  invoiceId?: string;
  orderLineId?: string;
  rawName?: string;
}

/** Servings of one menu sold on one day. In the demo they come from the 정산하기 button. */
export interface Sale {
  id: string;
  menuId: string;
  /** YYYY-MM-DD */
  date: string;
  quantity: number;
}

export interface RecipeLine {
  ingredientId: string;
  amount: number;
  unit: Unit;
}

export interface Menu {
  id: string;
  name: string;
  price: Won;
  servingLabel: string;
  recipe: RecipeLine[];
}

export interface MenuCostLine {
  ingredientId: string;
  amount: number;
  unit: Unit;
  baseQty: number | null;
  unitPricePerBase: number | null;
  priceDate: string | null;
  supplierId: string | null;
  cost: Won | null;
  previousCost: Won | null;
  issue: null | 'no-price' | 'unit-mismatch';
  /** True when stock runs out before this serving is covered; the shortfall uses the newest price. */
  stockShort: boolean;
}

export interface MenuCost {
  menuId: string;
  total: Won | null;
  partialTotal: Won;
  ratio: number | null;
  previousTotal: Won | null;
  lines: MenuCostLine[];
  missing: string[];
  unitIssues: string[];
}

export interface CostAlert {
  menuId: string;
  menuName: string;
  delta: Won;
  ingredientIds: string[];
}

export interface PriceChange {
  ingredientId: string;
  previousUnitPrice: number;
  currentUnitPrice: number;
  changeRate: number;
  currentDate: string;
  previousDate: string;
}

export interface SupplierProduct {
  id: string;
  supplierId: string;
  ingredientId: string;
  name: string;
  spec?: string;
  grade?: string;
  origin?: string;
  packSize: number;
  packUnit: Unit;
  price: Won;
  shippingFee: Won;
  minOrderAmount: Won;
  deliveryNote?: string;
  isDemo: boolean;
}

export interface Offer {
  product: SupplierProduct;
  comparable: boolean;
  reason: null | 'unit' | 'spec';
  unitPricePerBase: number | null;
  packs: number;
  itemsTotal: Won;
  shippingFee: Won;
  total: Won;
  meetsMinOrder: boolean;
}

export interface CartItem {
  productId: string;
  /** Integer pack count, at least one. */
  quantity: number;
}

export interface OrderLine {
  id: string;
  productId: string;
  supplierId: string;
  ingredientId: string;
  name: string;
  packSize: number;
  packUnit: Unit;
  quantity: number;
  price: Won;
  amount: Won;
}

export interface Order {
  id: string;
  status: 'placed' | 'received';
  isDemo: true;
  createdAt: string;
  receivedAt?: string;
  lines: OrderLine[];
  itemsTotal: Won;
  shippingTotal: Won;
  total: Won;
}

export interface ExtractItem {
  rawName: string;
  packSize: number | null;
  packUnit: Unit | null;
  quantity: number;
  /** Price per pack, as printed. */
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
  hasImage: boolean;
  supplierId?: string;
  date?: string;
  status: 'extracted' | 'confirmed';
  extraction: ExtractResult;
  isDemo: boolean;
  createdAt: string;
}

/** Four-week example indexes, first week = 100. */
export interface MarketIndex {
  mine: number[];
  market: number[];
}
