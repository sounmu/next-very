import type { Ingredient, Invoice, MarketIndex, Menu, Purchase, Sale, Supplier, SupplierProduct } from '../types';

export type PresetId = 'hankki' | 'pasta' | 'pizza' | 'gimbap';

/** A complete demo store. Store setup copies it into the store's rows with every id prefixed per store. */
export interface Preset {
  id: PresetId;
  /** Default store name, e.g. 한끼식당. */
  name: string;
  /** Label on the preset picker, e.g. 파스타. */
  label: string;
  description: string;
  ingredients: Ingredient[];
  suppliers: Supplier[];
  purchases: Purchase[];
  menus: Menu[];
  products: SupplierProduct[];
  sales: Sale[];
  /** Fixed OCR result used when GEMINI_API_KEY is missing. */
  demoInvoice: Invoice;
  marketIndex: Record<string, MarketIndex>;
}
