import type { Ingredient, Invoice, MarketIndex, Menu, Purchase, Sale, Supplier, SupplierProduct } from '../types';
import type { Preset } from './types';

/** 김밥 가게 demo, as of 2026-10-31. Catalog and orders are not live supplier services. */
const ingredients: Ingredient[] = [
  { id: 'rice', name: '쌀', baseUnit: 'g', aliases: [] },
  { id: 'gim', name: '김', baseUnit: 'ea', aliases: [] },
  { id: 'danmuji', name: '단무지', baseUnit: 'g', aliases: [] },
  { id: 'carrot', name: '당근', baseUnit: 'g', aliases: [] },
  { id: 'ham', name: '햄', baseUnit: 'g', aliases: [] },
  { id: 'egg', name: '계란', baseUnit: 'g', aliases: [] },
  { id: 'spinach', name: '시금치', baseUnit: 'g', aliases: [] },
  { id: 'tuna', name: '참치', baseUnit: 'g', aliases: [] },
  { id: 'mayonnaise', name: '마요네즈', baseUnit: 'g', aliases: [] },
  { id: 'perilla-leaf', name: '깻잎', baseUnit: 'ea', aliases: [] },
  { id: 'tteok', name: '떡', baseUnit: 'g', aliases: [] },
  { id: 'eomuk', name: '어묵', baseUnit: 'g', aliases: [] },
  { id: 'gochujang', name: '고추장', baseUnit: 'g', aliases: [] },
  { id: 'sugar', name: '설탕', baseUnit: 'g', aliases: [] },
  { id: 'green-onion', name: '대파', baseUnit: 'g', aliases: [] },
];

const suppliers: Supplier[] = [
  { id: 'daesung', name: '대성유통', createdAt: '2026-10-01T00:00:00.000Z' },
  { id: 'sea-food', name: '바다식품', createdAt: '2026-10-01T00:00:00.000Z' },
  { id: 'gim-maeul', name: '김마을', createdAt: '2026-10-01T00:00:00.000Z' },
];

const purchases: Purchase[] = [
  { id: 'purchase-tuna-2026-10-07', ingredientId: 'tuna', supplierId: 'daesung', date: '2026-10-07', packSize: 1, packUnit: 'kg', quantity: 5, amount: 75000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-tuna-2026-10-28', ingredientId: 'tuna', supplierId: 'daesung', date: '2026-10-28', packSize: 1, packUnit: 'kg', quantity: 5, amount: 100000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-rice-2026-10-07', ingredientId: 'rice', supplierId: 'daesung', date: '2026-10-07', packSize: 20, packUnit: 'kg', quantity: 3, amount: 180000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-gim-2026-10-07', ingredientId: 'gim', supplierId: 'daesung', date: '2026-10-07', packSize: 100, packUnit: 'ea', quantity: 5, amount: 75000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-danmuji-2026-10-07', ingredientId: 'danmuji', supplierId: 'daesung', date: '2026-10-07', packSize: 3, packUnit: 'kg', quantity: 3, amount: 27000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-carrot-2026-10-07', ingredientId: 'carrot', supplierId: 'daesung', date: '2026-10-07', packSize: 10, packUnit: 'kg', quantity: 1, amount: 40000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-ham-2026-10-07', ingredientId: 'ham', supplierId: 'daesung', date: '2026-10-07', packSize: 1, packUnit: 'kg', quantity: 4, amount: 48000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-egg-2026-10-07', ingredientId: 'egg', supplierId: 'daesung', date: '2026-10-07', packSize: 10, packUnit: 'kg', quantity: 1, amount: 90000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-spinach-2026-10-07', ingredientId: 'spinach', supplierId: 'daesung', date: '2026-10-07', packSize: 1, packUnit: 'kg', quantity: 4, amount: 32000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-mayonnaise-2026-10-07', ingredientId: 'mayonnaise', supplierId: 'daesung', date: '2026-10-07', packSize: 3, packUnit: 'kg', quantity: 2, amount: 36000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-perilla-leaf-2026-10-07', ingredientId: 'perilla-leaf', supplierId: 'daesung', date: '2026-10-07', packSize: 100, packUnit: 'ea', quantity: 7, amount: 70000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-tteok-2026-10-07', ingredientId: 'tteok', supplierId: 'daesung', date: '2026-10-07', packSize: 3, packUnit: 'kg', quantity: 5, amount: 60000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-eomuk-2026-10-07', ingredientId: 'eomuk', supplierId: 'daesung', date: '2026-10-07', packSize: 1, packUnit: 'kg', quantity: 4, amount: 32000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-gochujang-2026-10-07', ingredientId: 'gochujang', supplierId: 'daesung', date: '2026-10-07', packSize: 3, packUnit: 'kg', quantity: 1, amount: 21000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-sugar-2026-10-07', ingredientId: 'sugar', supplierId: 'daesung', date: '2026-10-07', packSize: 3, packUnit: 'kg', quantity: 1, amount: 6000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-green-onion-2026-10-07', ingredientId: 'green-onion', supplierId: 'daesung', date: '2026-10-07', packSize: 1, packUnit: 'kg', quantity: 1, amount: 5000, status: 'confirmed', source: 'receipt' },
];

const menus: Menu[] = [
  {
    id: 'basic-gimbap', name: '기본 김밥', price: 4500, servingLabel: '1줄',
    recipe: [
      { ingredientId: 'rice', amount: 100, unit: 'g' },
      { ingredientId: 'gim', amount: 1, unit: 'ea' },
      { ingredientId: 'danmuji', amount: 20, unit: 'g' },
      { ingredientId: 'carrot', amount: 20, unit: 'g' },
      { ingredientId: 'ham', amount: 20, unit: 'g' },
      { ingredientId: 'egg', amount: 30, unit: 'g' },
      { ingredientId: 'spinach', amount: 20, unit: 'g' },
    ],
  },
  {
    id: 'tuna-gimbap', name: '참치 김밥', price: 5000, servingLabel: '1줄',
    recipe: [
      { ingredientId: 'rice', amount: 100, unit: 'g' },
      { ingredientId: 'gim', amount: 1, unit: 'ea' },
      { ingredientId: 'danmuji', amount: 20, unit: 'g' },
      { ingredientId: 'tuna', amount: 40, unit: 'g' },
      { ingredientId: 'mayonnaise', amount: 15, unit: 'g' },
      { ingredientId: 'perilla-leaf', amount: 2, unit: 'ea' },
    ],
  },
  {
    id: 'tteokbokki', name: '떡볶이', price: 5000, servingLabel: '1인분',
    recipe: [
      { ingredientId: 'tteok', amount: 200, unit: 'g' },
      { ingredientId: 'eomuk', amount: 50, unit: 'g' },
      { ingredientId: 'gochujang', amount: 30, unit: 'g' },
      { ingredientId: 'sugar', amount: 15, unit: 'g' },
      { ingredientId: 'green-onion', amount: 10, unit: 'g' },
    ],
  },
];

const products: SupplierProduct[] = [
  { id: 'product-tuna-daesung', supplierId: 'daesung', ingredientId: 'tuna', name: '참치 1kg', packSize: 1, packUnit: 'kg', price: 20000, shippingFee: 0, minOrderAmount: 0, isDemo: true },
  { id: 'product-tuna-sea-food', supplierId: 'sea-food', ingredientId: 'tuna', name: '참치 1kg', packSize: 1, packUnit: 'kg', price: 15000, shippingFee: 3000, minOrderAmount: 30000, isDemo: true },
  { id: 'product-gim-daesung', supplierId: 'daesung', ingredientId: 'gim', name: '김밥김 100장', packSize: 100, packUnit: 'ea', price: 15000, shippingFee: 0, minOrderAmount: 0, isDemo: true },
  { id: 'product-gim-gim-maeul', supplierId: 'gim-maeul', ingredientId: 'gim', name: '김밥김 100장', packSize: 100, packUnit: 'ea', price: 13000, shippingFee: 3000, minOrderAmount: 30000, isDemo: true },
];

/** Fixed OCR result used when GEMINI_API_KEY is missing. Not inserted into the DB: unsaved invoices are not kept. */
const demoInvoice: Invoice = {
  id: 'invoice-demo-gimbap-2026-10-31',
  hasImage: false,
  supplierId: 'sea-food',
  date: '2026-10-31',
  status: 'extracted',
  isDemo: true,
  createdAt: '2026-10-31T00:00:00.000Z',
  extraction: {
    supplier: '바다식품',
    date: '2026-10-31',
    items: [{
      rawName: '참치', packSize: 1, packUnit: 'kg', quantity: 5,
      unitPrice: 15000, amount: 75000, confidence: 'high',
    }],
    total: 75000,
  },
};

/**
 * October sales through 10/30. They use up the 10/07 tuna lot (1g당 15원) and leave 400g of
 * the 10/28 lot (1g당 20원), so 참치 김밥 starts at 1,600원 and stays there after a cheaper
 * receipt until two settlements use the rest.
 */
const sales: Sale[] = [
  { id: 'sale-2026-10-30-tuna-gimbap', menuId: 'tuna-gimbap', date: '2026-10-30', quantity: 240 },
  { id: 'sale-2026-10-30-basic-gimbap', menuId: 'basic-gimbap', date: '2026-10-30', quantity: 150 },
  { id: 'sale-2026-10-30-tteokbokki', menuId: 'tteokbokki', date: '2026-10-30', quantity: 60 },
];

const marketIndex: Record<string, MarketIndex> = {
  'tuna': { mine: [100, 100, 100, 133], market: [100, 99, 98, 97] },
};

export const gimbapPreset: Preset = {
  id: 'gimbap',
  name: '김밥 가게',
  label: '김밥',
  description: '김밥·떡볶이 등 분식을 팔아요',
  ingredients, suppliers, purchases, menus, products, sales, demoInvoice, marketIndex,
};
