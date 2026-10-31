import type { Ingredient, Invoice, MarketIndex, Menu, Purchase, Supplier, SupplierProduct } from './types';

/** 한끼식당 demo, as of 2026-10-31. Catalog and orders are not live supplier services. */
const ingredients: Ingredient[] = [
  { id: 'pork-shoulder', name: '돼지고기 앞다리', spec: '국산 냉장', baseUnit: 'g', marketCode: 'kamis-pork-shoulder', aliases: ['돈앞다리', '앞다리살', '돼지 전지'] },
  { id: 'rice', name: '쌀', baseUnit: 'g', marketCode: 'kamis-rice', aliases: [] },
  { id: 'onion', name: '양파', baseUnit: 'g', marketCode: 'kamis-onion', aliases: [] },
  { id: 'green-onion', name: '대파', baseUnit: 'g', marketCode: 'kamis-green-onion', aliases: [] },
  { id: 'jeyuk-sauce', name: '제육 소스', baseUnit: 'g', aliases: [] },
  { id: 'kimchi', name: '김치', baseUnit: 'g', aliases: [] },
  { id: 'pork-neck', name: '돼지고기 목살', baseUnit: 'g', marketCode: 'kamis-pork-neck', aliases: [] },
  { id: 'tofu', name: '두부', baseUnit: 'g', aliases: [] },
  { id: 'egg', name: '계란', baseUnit: 'g', marketCode: 'kamis-egg', aliases: [] },
  { id: 'carrot', name: '당근', baseUnit: 'g', marketCode: 'kamis-carrot', aliases: [] },
  { id: 'cooking-oil', name: '식용유', baseUnit: 'mL', aliases: [] },
  { id: 'milk', name: '우유', baseUnit: 'mL', aliases: ['우유 1L', '흰우유'] },
  { id: 'coffee-beans', name: '원두', spec: '블렌드', baseUnit: 'g', aliases: ['원두커피'] },
];

const suppliers: Supplier[] = [
  { id: 'daesung', name: '대성유통', createdAt: '2026-10-01T00:00:00.000Z' },
  { id: 'hanuri', name: '한우리축산', createdAt: '2026-10-01T00:00:00.000Z' },
  { id: 'meatone', name: '미트원', createdAt: '2026-10-01T00:00:00.000Z' },
  { id: 'hanbit', name: '한빛식자재', createdAt: '2026-10-01T00:00:00.000Z' },
  { id: 'dairy-direct', name: '목장직송', createdAt: '2026-10-01T00:00:00.000Z' },
  { id: 'coffee-lab', name: '커피랩', createdAt: '2026-10-01T00:00:00.000Z' },
  { id: 'bean-market', name: '빈마켓', createdAt: '2026-10-01T00:00:00.000Z' },
  { id: 'greenfarm', name: '그린팜', createdAt: '2026-10-01T00:00:00.000Z' },
];

const purchases: Purchase[] = [
  { id: 'purchase-pork-shoulder-2026-10-07', ingredientId: 'pork-shoulder', supplierId: 'daesung', date: '2026-10-07', packSize: 10, packUnit: 'kg', quantity: 1, amount: 90000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-pork-shoulder-2026-10-28', ingredientId: 'pork-shoulder', supplierId: 'daesung', date: '2026-10-28', packSize: 10, packUnit: 'kg', quantity: 1, amount: 100000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-rice-2026-10-07', ingredientId: 'rice', supplierId: 'daesung', date: '2026-10-07', packSize: 20, packUnit: 'kg', quantity: 1, amount: 60000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-onion-2026-10-07', ingredientId: 'onion', supplierId: 'daesung', date: '2026-10-07', packSize: 15, packUnit: 'kg', quantity: 1, amount: 45000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-green-onion-2026-10-07', ingredientId: 'green-onion', supplierId: 'daesung', date: '2026-10-07', packSize: 1, packUnit: 'kg', quantity: 2, amount: 10000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-jeyuk-sauce-2026-10-07', ingredientId: 'jeyuk-sauce', supplierId: 'daesung', date: '2026-10-07', packSize: 2, packUnit: 'kg', quantity: 1, amount: 26000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-kimchi-2026-10-07', ingredientId: 'kimchi', supplierId: 'daesung', date: '2026-10-07', packSize: 10, packUnit: 'kg', quantity: 1, amount: 60000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-pork-neck-2026-10-07', ingredientId: 'pork-neck', supplierId: 'daesung', date: '2026-10-07', packSize: 5, packUnit: 'kg', quantity: 1, amount: 65000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-tofu-2026-10-07', ingredientId: 'tofu', supplierId: 'daesung', date: '2026-10-07', packSize: 2, packUnit: 'kg', quantity: 2, amount: 16000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-egg-2026-10-07', ingredientId: 'egg', supplierId: 'daesung', date: '2026-10-07', packSize: 10, packUnit: 'kg', quantity: 1, amount: 90000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-carrot-2026-10-07', ingredientId: 'carrot', supplierId: 'daesung', date: '2026-10-07', packSize: 10, packUnit: 'kg', quantity: 1, amount: 40000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-cooking-oil-2026-10-07', ingredientId: 'cooking-oil', supplierId: 'daesung', date: '2026-10-07', packSize: 18, packUnit: 'L', quantity: 1, amount: 126000, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-milk-2026-10-30', ingredientId: 'milk', supplierId: 'hanbit', date: '2026-10-30', packSize: 1, packUnit: 'L', quantity: 12, amount: 33600, status: 'confirmed', source: 'receipt' },
  { id: 'purchase-coffee-beans-2026-10-29', ingredientId: 'coffee-beans', supplierId: 'coffee-lab', date: '2026-10-29', packSize: 1, packUnit: 'kg', quantity: 1, amount: 24444, status: 'confirmed', source: 'receipt' },
];

const menus: Menu[] = [
  {
    id: 'jeyuk-deopbap', name: '제육덮밥', price: 10000, servingLabel: '1인분',
    recipe: [
      { ingredientId: 'pork-shoulder', amount: 200, unit: 'g' },
      { ingredientId: 'rice', amount: 100, unit: 'g' },
      { ingredientId: 'onion', amount: 50, unit: 'g' },
      { ingredientId: 'green-onion', amount: 20, unit: 'g' },
      { ingredientId: 'jeyuk-sauce', amount: 50, unit: 'g' },
    ],
  },
  {
    id: 'kimchi-jjigae', name: '김치찌개', price: 9000, servingLabel: '1인분',
    recipe: [
      { ingredientId: 'kimchi', amount: 150, unit: 'g' },
      { ingredientId: 'pork-neck', amount: 70, unit: 'g' },
      { ingredientId: 'tofu', amount: 100, unit: 'g' },
      { ingredientId: 'rice', amount: 100, unit: 'g' },
      { ingredientId: 'green-onion', amount: 20, unit: 'g' },
      { ingredientId: 'onion', amount: 30, unit: 'g' },
    ],
  },
  {
    id: 'gyeran-mari', name: '계란말이', price: 8000, servingLabel: '1인분',
    recipe: [
      { ingredientId: 'egg', amount: 180, unit: 'g' },
      { ingredientId: 'carrot', amount: 30, unit: 'g' },
      { ingredientId: 'green-onion', amount: 20, unit: 'g' },
      { ingredientId: 'onion', amount: 30, unit: 'g' },
      { ingredientId: 'cooking-oil', amount: 10, unit: 'mL' },
    ],
  },
  {
    id: 'cafe-latte', name: '카페라테', price: 4500, servingLabel: '1잔',
    recipe: [
      { ingredientId: 'milk', amount: 250, unit: 'mL' },
      { ingredientId: 'coffee-beans', amount: 18, unit: 'g' },
    ],
  },
];

const products: SupplierProduct[] = [
  { id: 'product-pork-shoulder-daesung', supplierId: 'daesung', ingredientId: 'pork-shoulder', name: '국산 냉장 앞다리', spec: '국산 냉장', grade: '1등급', packSize: 10, packUnit: 'kg', price: 100000, shippingFee: 0, minOrderAmount: 50000, isDemo: true },
  { id: 'product-pork-shoulder-hanuri', supplierId: 'hanuri', ingredientId: 'pork-shoulder', name: '국산 냉장 앞다리', spec: '국산 냉장', grade: '1등급', packSize: 10, packUnit: 'kg', price: 90000, shippingFee: 3000, minOrderAmount: 90000, isDemo: true },
  { id: 'product-pork-shoulder-meatone', supplierId: 'meatone', ingredientId: 'pork-shoulder', name: '스페인산 냉동 앞다리', spec: '수입 냉동', origin: '스페인', packSize: 5, packUnit: 'kg', price: 32500, shippingFee: 4000, minOrderAmount: 30000, isDemo: true },
  { id: 'product-milk-hanbit', supplierId: 'hanbit', ingredientId: 'milk', name: '우유 1L', packSize: 1, packUnit: 'L', price: 2800, shippingFee: 3000, minOrderAmount: 30000, isDemo: true },
  { id: 'product-milk-dairy-direct', supplierId: 'dairy-direct', ingredientId: 'milk', name: '목장 우유 1L', packSize: 1, packUnit: 'L', price: 2600, shippingFee: 4000, minOrderAmount: 20000, isDemo: true },
  { id: 'product-coffee-beans-coffee-lab', supplierId: 'coffee-lab', ingredientId: 'coffee-beans', name: '하우스 블렌드 1kg', spec: '블렌드', packSize: 1, packUnit: 'kg', price: 24444, shippingFee: 3000, minOrderAmount: 0, isDemo: true },
  { id: 'product-coffee-beans-bean-market', supplierId: 'bean-market', ingredientId: 'coffee-beans', name: '블렌드 원두 1kg', spec: '블렌드', packSize: 1, packUnit: 'kg', price: 22000, shippingFee: 3500, minOrderAmount: 40000, isDemo: true },
  { id: 'product-onion-daesung', supplierId: 'daesung', ingredientId: 'onion', name: '양파 15kg', packSize: 15, packUnit: 'kg', price: 45000, shippingFee: 0, minOrderAmount: 0, isDemo: true },
  { id: 'product-onion-greenfarm', supplierId: 'greenfarm', ingredientId: 'onion', name: '산지 양파 15kg', packSize: 15, packUnit: 'kg', price: 39000, shippingFee: 3000, minOrderAmount: 30000, isDemo: true },
];

/** Fixed OCR result used when GEMINI_API_KEY is missing. Not inserted into the DB: unsaved invoices are not kept. */
const demoInvoice: Invoice = {
  id: 'invoice-demo-hanuri-2026-10-31',
  hasImage: false,
  supplierId: 'hanuri',
  date: '2026-10-31',
  status: 'extracted',
  isDemo: true,
  createdAt: '2026-10-31T00:00:00.000Z',
  extraction: {
    supplier: '한우리축산',
    date: '2026-10-31',
    items: [{
      rawName: '돼지고기 앞다리', packSize: 10, packUnit: 'kg', quantity: 1,
      unitPrice: 90000, amount: 90000, confidence: 'high',
    }],
    total: 90000,
  },
};

const marketIndex: Record<string, MarketIndex> = {
  'pork-shoulder': { mine: [100, 100, 100, 111], market: [100, 99, 98, 97] },
};

export const seed = { ingredients, suppliers, purchases, menus, products, demoInvoice, marketIndex };
