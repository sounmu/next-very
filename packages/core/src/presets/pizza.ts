import type { Ingredient, Invoice, MarketIndex, Menu, Purchase, Sale, Supplier, SupplierProduct } from '../types';
import type { Preset } from './types';

/** 피자 가게 demo, as of 2026-10-31. Catalog and orders are not live supplier services. */
const ingredients: Ingredient[] = [
  { id: 'bread-flour', name: '강력분', baseUnit: 'g', aliases: [] },
  { id: 'dough', name: '냉동 피자도우', baseUnit: 'ea', aliases: [] },
  { id: 'tomato-sauce', name: '피자 토마토소스', baseUnit: 'g', aliases: [] },
  // The fixed demo receipt reads 모짜렐라, so the name stays as is for the alias match.
  { id: 'mozzarella', name: '모짜렐라', baseUnit: 'g', aliases: [] },
  { id: 'basil', name: '바질', baseUnit: 'g', aliases: [] },
  { id: 'olive-oil', name: '올리브오일', baseUnit: 'mL', aliases: [] },
  { id: 'pepperoni', name: '페퍼로니', baseUnit: 'g', aliases: [] },
  { id: 'bacon', name: '베이컨', baseUnit: 'g', aliases: [] },
  { id: 'bulgogi-topping', name: '불고기 토핑', baseUnit: 'g', aliases: [] },
  { id: 'mushroom', name: '양송이버섯', baseUnit: 'g', aliases: [] },
  { id: 'onion', name: '양파', baseUnit: 'g', aliases: [] },
  { id: 'bell-pepper', name: '피망', baseUnit: 'g', aliases: [] },
  { id: 'black-olive', name: '블랙올리브 슬라이스', baseUnit: 'g', aliases: [] },
  { id: 'sweet-corn', name: '스위트콘', baseUnit: 'g', aliases: [] },
  { id: 'pineapple', name: '파인애플 통조림', baseUnit: 'g', aliases: [] },
  { id: 'pickle', name: '오이피클', baseUnit: 'g', aliases: [] },
  { id: 'gorgonzola', name: '고르곤졸라', baseUnit: 'g', aliases: [] },
  { id: 'honey', name: '꿀', baseUnit: 'g', aliases: [] },
];

const suppliers: Supplier[] = [
  { id: 'daesung', name: '대성유통', createdAt: '2026-10-01T00:00:00.000Z' },
  { id: 'cheese-market', name: '치즈마켓', createdAt: '2026-10-01T00:00:00.000Z' },
  { id: 'meatone', name: '미트원', createdAt: '2026-10-01T00:00:00.000Z' },
  { id: 'pizza-mall', name: '피자재료몰', createdAt: '2026-10-01T00:00:00.000Z' },
  { id: 'greenfarm', name: '그린팜', createdAt: '2026-10-01T00:00:00.000Z' },
];

const purchases: Purchase[] = [
  { id: 'purchase-mozzarella-2026-10-07', ingredientId: 'mozzarella', supplierId: 'daesung', date: '2026-10-07', packSize: 2.5, packUnit: 'kg', quantity: 4, amount: 100000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-mozzarella-2026-10-28', ingredientId: 'mozzarella', supplierId: 'daesung', date: '2026-10-28', packSize: 2.5, packUnit: 'kg', quantity: 4, amount: 120000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-dough-2026-10-07', ingredientId: 'dough', supplierId: 'daesung', date: '2026-10-07', packSize: 10, packUnit: 'ea', quantity: 16, amount: 240000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-tomato-sauce-2026-10-07', ingredientId: 'tomato-sauce', supplierId: 'daesung', date: '2026-10-07', packSize: 3, packUnit: 'kg', quantity: 3, amount: 45000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-basil-2026-10-07', ingredientId: 'basil', supplierId: 'daesung', date: '2026-10-07', packSize: 100, packUnit: 'g', quantity: 3, amount: 15000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-olive-oil-2026-10-07', ingredientId: 'olive-oil', supplierId: 'daesung', date: '2026-10-07', packSize: 1, packUnit: 'L', quantity: 1, amount: 12000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-pepperoni-2026-10-07', ingredientId: 'pepperoni', supplierId: 'daesung', date: '2026-10-07', packSize: 1, packUnit: 'kg', quantity: 3, amount: 75000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-gorgonzola-2026-10-07', ingredientId: 'gorgonzola', supplierId: 'daesung', date: '2026-10-07', packSize: 1, packUnit: 'kg', quantity: 3, amount: 120000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-honey-2026-10-07', ingredientId: 'honey', supplierId: 'daesung', date: '2026-10-07', packSize: 1, packUnit: 'kg', quantity: 1, amount: 15000, status: 'confirmed', source: 'receipt' },
];

const menus: Menu[] = [
  {
    id: 'margherita', name: '마르게리타', price: 18000, servingLabel: '1판',
    recipe: [
      { ingredientId: 'dough', amount: 1, unit: 'ea' },
      { ingredientId: 'tomato-sauce', amount: 80, unit: 'g' },
      { ingredientId: 'mozzarella', amount: 200, unit: 'g' },
      { ingredientId: 'basil', amount: 3, unit: 'g' },
      { ingredientId: 'olive-oil', amount: 10, unit: 'mL' },
    ],
  },
  {
    id: 'pepperoni-pizza', name: '페퍼로니', price: 21000, servingLabel: '1판',
    recipe: [
      { ingredientId: 'dough', amount: 1, unit: 'ea' },
      { ingredientId: 'tomato-sauce', amount: 80, unit: 'g' },
      { ingredientId: 'mozzarella', amount: 150, unit: 'g' },
      { ingredientId: 'pepperoni', amount: 60, unit: 'g' },
    ],
  },
  {
    id: 'gorgonzola-pizza', name: '고르곤졸라', price: 22000, servingLabel: '1판',
    recipe: [
      { ingredientId: 'dough', amount: 1, unit: 'ea' },
      { ingredientId: 'mozzarella', amount: 100, unit: 'g' },
      { ingredientId: 'gorgonzola', amount: 50, unit: 'g' },
      { ingredientId: 'honey', amount: 20, unit: 'g' },
    ],
  },
];

const products: SupplierProduct[] = [
  { id: 'product-mozzarella-daesung', supplierId: 'daesung', ingredientId: 'mozzarella', name: '모짜렐라 2.5kg', packSize: 2.5, packUnit: 'kg', price: 30000, shippingFee: 0, minOrderAmount: 0, isDemo: true },
  { id: 'product-mozzarella-cheese-market', supplierId: 'cheese-market', ingredientId: 'mozzarella', name: '모짜렐라 2.5kg', packSize: 2.5, packUnit: 'kg', price: 25000, shippingFee: 4000, minOrderAmount: 50000, isDemo: true },
  { id: 'product-pepperoni-daesung', supplierId: 'daesung', ingredientId: 'pepperoni', name: '페퍼로니 1kg', packSize: 1, packUnit: 'kg', price: 25000, shippingFee: 0, minOrderAmount: 0, isDemo: true },
  { id: 'product-pepperoni-meatone', supplierId: 'meatone', ingredientId: 'pepperoni', name: '페퍼로니 1kg', packSize: 1, packUnit: 'kg', price: 22000, shippingFee: 4000, minOrderAmount: 30000, isDemo: true },
  // Prices below follow October 2026 online retail prices for food-service packs.
  { id: 'product-bread-flour-daesung', supplierId: 'daesung', ingredientId: 'bread-flour', name: '강력분 20kg', packSize: 20, packUnit: 'kg', price: 29000, shippingFee: 0, minOrderAmount: 0, isDemo: true },
  { id: 'product-bread-flour-pizza-mall', supplierId: 'pizza-mall', ingredientId: 'bread-flour', name: '강력분 20kg', packSize: 20, packUnit: 'kg', price: 25500, shippingFee: 4000, minOrderAmount: 0, isDemo: true },
  { id: 'product-dough-daesung', supplierId: 'daesung', ingredientId: 'dough', name: '냉동 피자도우 10인치 10장', packSize: 10, packUnit: 'ea', price: 16500, shippingFee: 0, minOrderAmount: 0, isDemo: true },
  { id: 'product-dough-pizza-mall', supplierId: 'pizza-mall', ingredientId: 'dough', name: '냉동 피자도우 10인치 10장', packSize: 10, packUnit: 'ea', price: 14900, shippingFee: 4000, minOrderAmount: 50000, isDemo: true },
  { id: 'product-tomato-sauce-daesung', supplierId: 'daesung', ingredientId: 'tomato-sauce', name: '피자 토마토소스 3kg', packSize: 3, packUnit: 'kg', price: 15500, shippingFee: 0, minOrderAmount: 0, isDemo: true },
  { id: 'product-tomato-sauce-pizza-mall', supplierId: 'pizza-mall', ingredientId: 'tomato-sauce', name: '피자 토마토소스 3kg', packSize: 3, packUnit: 'kg', price: 12900, shippingFee: 4000, minOrderAmount: 0, isDemo: true },
  { id: 'product-bacon-daesung', supplierId: 'daesung', ingredientId: 'bacon', name: '베이컨 1kg', packSize: 1, packUnit: 'kg', price: 19000, shippingFee: 0, minOrderAmount: 0, isDemo: true },
  { id: 'product-bacon-meatone', supplierId: 'meatone', ingredientId: 'bacon', name: '베이컨 1kg', packSize: 1, packUnit: 'kg', price: 16500, shippingFee: 4000, minOrderAmount: 30000, isDemo: true },
  { id: 'product-bulgogi-topping-meatone', supplierId: 'meatone', ingredientId: 'bulgogi-topping', name: '불고기 토핑 1kg', packSize: 1, packUnit: 'kg', price: 13500, shippingFee: 4000, minOrderAmount: 30000, isDemo: true },
  { id: 'product-bulgogi-topping-pizza-mall', supplierId: 'pizza-mall', ingredientId: 'bulgogi-topping', name: '불고기 토핑 1kg', packSize: 1, packUnit: 'kg', price: 12900, shippingFee: 4000, minOrderAmount: 0, isDemo: true },
  { id: 'product-mushroom-daesung', supplierId: 'daesung', ingredientId: 'mushroom', name: '양송이버섯 1kg', origin: '국산', packSize: 1, packUnit: 'kg', price: 13000, shippingFee: 0, minOrderAmount: 0, isDemo: true },
  { id: 'product-mushroom-greenfarm', supplierId: 'greenfarm', ingredientId: 'mushroom', name: '양송이버섯 1kg', origin: '국산', packSize: 1, packUnit: 'kg', price: 10500, shippingFee: 3000, minOrderAmount: 0, isDemo: true },
  { id: 'product-onion-daesung', supplierId: 'daesung', ingredientId: 'onion', name: '양파 15kg', origin: '국산', packSize: 15, packUnit: 'kg', price: 28000, shippingFee: 0, minOrderAmount: 0, isDemo: true },
  { id: 'product-onion-greenfarm', supplierId: 'greenfarm', ingredientId: 'onion', name: '산지 양파 15kg', origin: '국산', packSize: 15, packUnit: 'kg', price: 23500, shippingFee: 3000, minOrderAmount: 20000, isDemo: true },
  { id: 'product-bell-pepper-daesung', supplierId: 'daesung', ingredientId: 'bell-pepper', name: '피망 1kg', origin: '국산', packSize: 1, packUnit: 'kg', price: 9000, shippingFee: 0, minOrderAmount: 0, isDemo: true },
  { id: 'product-bell-pepper-greenfarm', supplierId: 'greenfarm', ingredientId: 'bell-pepper', name: '피망 1kg', origin: '국산', packSize: 1, packUnit: 'kg', price: 7500, shippingFee: 3000, minOrderAmount: 0, isDemo: true },
  { id: 'product-black-olive-daesung', supplierId: 'daesung', ingredientId: 'black-olive', name: '블랙올리브 슬라이스 3kg', origin: '스페인', packSize: 3, packUnit: 'kg', price: 15900, shippingFee: 0, minOrderAmount: 0, isDemo: true },
  { id: 'product-black-olive-pizza-mall', supplierId: 'pizza-mall', ingredientId: 'black-olive', name: '블랙올리브 슬라이스 3kg', origin: '스페인', packSize: 3, packUnit: 'kg', price: 13900, shippingFee: 4000, minOrderAmount: 0, isDemo: true },
  { id: 'product-sweet-corn-daesung', supplierId: 'daesung', ingredientId: 'sweet-corn', name: '스위트콘 2.95kg', packSize: 2.95, packUnit: 'kg', price: 8900, shippingFee: 0, minOrderAmount: 0, isDemo: true },
  { id: 'product-sweet-corn-pizza-mall', supplierId: 'pizza-mall', ingredientId: 'sweet-corn', name: '스위트콘 2.95kg', packSize: 2.95, packUnit: 'kg', price: 7500, shippingFee: 4000, minOrderAmount: 0, isDemo: true },
  { id: 'product-pineapple-daesung', supplierId: 'daesung', ingredientId: 'pineapple', name: '파인애플 슬라이스 통조림 3kg', packSize: 3, packUnit: 'kg', price: 12500, shippingFee: 0, minOrderAmount: 0, isDemo: true },
  { id: 'product-pineapple-pizza-mall', supplierId: 'pizza-mall', ingredientId: 'pineapple', name: '파인애플 통조림 3kg', packSize: 3, packUnit: 'kg', price: 8400, shippingFee: 4000, minOrderAmount: 0, isDemo: true },
  { id: 'product-pickle-daesung', supplierId: 'daesung', ingredientId: 'pickle', name: '오이피클 3kg', packSize: 3, packUnit: 'kg', price: 10500, shippingFee: 0, minOrderAmount: 0, isDemo: true },
  { id: 'product-pickle-pizza-mall', supplierId: 'pizza-mall', ingredientId: 'pickle', name: '오이피클 3kg', packSize: 3, packUnit: 'kg', price: 8500, shippingFee: 4000, minOrderAmount: 0, isDemo: true },
];

/** Fixed OCR result used when GEMINI_API_KEY is missing. Not inserted into the DB: unsaved invoices are not kept. */
const demoInvoice: Invoice = {
  id: 'invoice-demo-pizza-2026-10-31',
  hasImage: false,
  supplierId: 'cheese-market',
  date: '2026-10-31',
  status: 'extracted',
  isDemo: true,
  createdAt: '2026-10-31T00:00:00.000Z',
  extraction: {
    supplier: '치즈마켓',
    date: '2026-10-31',
    items: [{
      rawName: '모짜렐라', packSize: 2.5, packUnit: 'kg', quantity: 4,
      unitPrice: 25000, amount: 100000, confidence: 'high',
    }],
    total: 100000,
  },
};

/**
 * October sales through 10/30. They use up the 10/07 mozzarella lot (1g당 10원) and leave 4kg of
 * the 10/28 lot (1g당 12원), so 마르게리타 starts at 4,570원 and stays there after a cheaper
 * receipt until two settlements use the rest.
 */
const sales: Sale[] = [
  { id: 'sale-2026-10-30-margherita', menuId: 'margherita', date: '2026-10-30', quantity: 40 },
  { id: 'sale-2026-10-30-pepperoni-pizza', menuId: 'pepperoni-pizza', date: '2026-10-30', quantity: 30 },
  { id: 'sale-2026-10-30-gorgonzola-pizza', menuId: 'gorgonzola-pizza', date: '2026-10-30', quantity: 35 },
];

const marketIndex: Record<string, MarketIndex> = {
  'mozzarella': { mine: [100, 100, 100, 120], market: [100, 99, 98, 97] },
};

export const pizzaPreset: Preset = {
  id: 'pizza',
  name: '피자 가게',
  label: '피자',
  description: '피자 메뉴를 팔아요',
  ingredients, suppliers, purchases, menus, products, sales, demoInvoice, marketIndex,
};
