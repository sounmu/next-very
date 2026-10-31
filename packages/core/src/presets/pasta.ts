import type { Ingredient, Invoice, MarketIndex, Menu, Purchase, Sale, Supplier, SupplierProduct } from '../types';
import type { Preset } from './types';

/** 파스타 가게 demo, as of 2026-10-31. Catalog and orders are not live supplier services. */
const ingredients: Ingredient[] = [
  { id: 'spaghetti', name: '스파게티면', baseUnit: 'g', aliases: [] },
  { id: 'garlic', name: '마늘', baseUnit: 'g', aliases: [] },
  { id: 'olive-oil', name: '올리브오일', baseUnit: 'mL', aliases: [] },
  { id: 'peperoncino', name: '페페론치노', baseUnit: 'g', aliases: [] },
  { id: 'tomato-sauce', name: '토마토소스', baseUnit: 'g', aliases: [] },
  { id: 'onion', name: '양파', baseUnit: 'g', aliases: [] },
  { id: 'cream', name: '생크림', baseUnit: 'mL', aliases: [] },
  { id: 'milk', name: '우유', baseUnit: 'mL', aliases: [] },
  { id: 'bacon', name: '베이컨', baseUnit: 'g', aliases: [] },
];

const suppliers: Supplier[] = [
  { id: 'daesung', name: '대성유통', createdAt: '2026-10-01T00:00:00.000Z' },
  { id: 'dairy-direct', name: '목장직송', createdAt: '2026-10-01T00:00:00.000Z' },
  { id: 'meatone', name: '미트원', createdAt: '2026-10-01T00:00:00.000Z' },
];

const purchases: Purchase[] = [
  { id: 'purchase-cream-2026-10-07', ingredientId: 'cream', supplierId: 'daesung', date: '2026-10-07', packSize: 1, packUnit: 'L', quantity: 5, amount: 30000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-cream-2026-10-28', ingredientId: 'cream', supplierId: 'daesung', date: '2026-10-28', packSize: 1, packUnit: 'L', quantity: 5, amount: 40000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-spaghetti-2026-10-07', ingredientId: 'spaghetti', supplierId: 'daesung', date: '2026-10-07', packSize: 5, packUnit: 'kg', quantity: 4, amount: 60000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-garlic-2026-10-07', ingredientId: 'garlic', supplierId: 'daesung', date: '2026-10-07', packSize: 1, packUnit: 'kg', quantity: 1, amount: 10000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-olive-oil-2026-10-07', ingredientId: 'olive-oil', supplierId: 'daesung', date: '2026-10-07', packSize: 1, packUnit: 'L', quantity: 2, amount: 24000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-peperoncino-2026-10-07', ingredientId: 'peperoncino', supplierId: 'daesung', date: '2026-10-07', packSize: 100, packUnit: 'g', quantity: 1, amount: 5000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-tomato-sauce-2026-10-07', ingredientId: 'tomato-sauce', supplierId: 'daesung', date: '2026-10-07', packSize: 3, packUnit: 'kg', quantity: 2, amount: 30000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-onion-2026-10-07', ingredientId: 'onion', supplierId: 'daesung', date: '2026-10-07', packSize: 15, packUnit: 'kg', quantity: 1, amount: 45000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-milk-2026-10-07', ingredientId: 'milk', supplierId: 'daesung', date: '2026-10-07', packSize: 1, packUnit: 'L', quantity: 12, amount: 33600, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-bacon-2026-10-07', ingredientId: 'bacon', supplierId: 'daesung', date: '2026-10-07', packSize: 1, packUnit: 'kg', quantity: 5, amount: 100000, status: 'confirmed', source: 'receipt' },
];

const menus: Menu[] = [
  {
    id: 'aglio-olio', name: '알리오 올리오', price: 12000, servingLabel: '1인분',
    recipe: [
      { ingredientId: 'spaghetti', amount: 100, unit: 'g' },
      { ingredientId: 'garlic', amount: 15, unit: 'g' },
      { ingredientId: 'olive-oil', amount: 20, unit: 'mL' },
      { ingredientId: 'peperoncino', amount: 1, unit: 'g' },
    ],
  },
  {
    id: 'tomato-pasta', name: '토마토 파스타', price: 13000, servingLabel: '1인분',
    recipe: [
      { ingredientId: 'spaghetti', amount: 100, unit: 'g' },
      { ingredientId: 'tomato-sauce', amount: 150, unit: 'g' },
      { ingredientId: 'onion', amount: 30, unit: 'g' },
      { ingredientId: 'olive-oil', amount: 10, unit: 'mL' },
    ],
  },
  {
    id: 'cream-pasta', name: '크림 파스타', price: 15000, servingLabel: '1인분',
    recipe: [
      { ingredientId: 'spaghetti', amount: 100, unit: 'g' },
      { ingredientId: 'cream', amount: 100, unit: 'mL' },
      { ingredientId: 'milk', amount: 50, unit: 'mL' },
      { ingredientId: 'bacon', amount: 40, unit: 'g' },
      { ingredientId: 'onion', amount: 30, unit: 'g' },
    ],
  },
];

const products: SupplierProduct[] = [
  { id: 'product-cream-daesung', supplierId: 'daesung', ingredientId: 'cream', name: '생크림 1L', packSize: 1, packUnit: 'L', price: 8000, shippingFee: 0, minOrderAmount: 0, isDemo: true },
  { id: 'product-cream-dairy-direct', supplierId: 'dairy-direct', ingredientId: 'cream', name: '목장 생크림 1L', packSize: 1, packUnit: 'L', price: 6000, shippingFee: 3000, minOrderAmount: 20000, isDemo: true },
  { id: 'product-bacon-daesung', supplierId: 'daesung', ingredientId: 'bacon', name: '베이컨 1kg', packSize: 1, packUnit: 'kg', price: 20000, shippingFee: 0, minOrderAmount: 0, isDemo: true },
  { id: 'product-bacon-meatone', supplierId: 'meatone', ingredientId: 'bacon', name: '베이컨 1kg', packSize: 1, packUnit: 'kg', price: 18000, shippingFee: 4000, minOrderAmount: 30000, isDemo: true },
];

/** Fixed OCR result used when GEMINI_API_KEY is missing. Not inserted into the DB: unsaved invoices are not kept. */
const demoInvoice: Invoice = {
  id: 'invoice-demo-pasta-2026-10-31',
  hasImage: false,
  supplierId: 'dairy-direct',
  date: '2026-10-31',
  status: 'extracted',
  isDemo: true,
  createdAt: '2026-10-31T00:00:00.000Z',
  extraction: {
    supplier: '목장직송',
    date: '2026-10-31',
    items: [{
      rawName: '생크림', packSize: 1, packUnit: 'L', quantity: 5,
      unitPrice: 6000, amount: 30000, confidence: 'high',
    }],
    total: 30000,
  },
};

/**
 * October sales through 10/30. They use up the 10/07 cream lot (1mL당 6원) and leave 0.8L of
 * the 10/28 lot (1mL당 8원), so 크림 파스타 starts at 2,130원 and stays there after a cheaper
 * receipt until two settlements use the rest.
 */
const sales: Sale[] = [
  { id: 'sale-2026-10-30-cream-pasta', menuId: 'cream-pasta', date: '2026-10-30', quantity: 92 },
  { id: 'sale-2026-10-30-aglio-olio', menuId: 'aglio-olio', date: '2026-10-30', quantity: 30 },
  { id: 'sale-2026-10-30-tomato-pasta', menuId: 'tomato-pasta', date: '2026-10-30', quantity: 30 },
];

const marketIndex: Record<string, MarketIndex> = {
  'cream': { mine: [100, 100, 100, 133], market: [100, 99, 98, 97] },
};

export const pastaPreset: Preset = {
  id: 'pasta',
  name: '파스타 가게',
  label: '파스타',
  description: '파스타·양식 메뉴를 팔아요',
  ingredients, suppliers, purchases, menus, products, sales, demoInvoice, marketIndex,
};
