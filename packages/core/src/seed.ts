import { unitPriceFromPack } from './cost';
import type {
  ExtractResult,
  Grams,
  Ingredient,
  MarketIndex,
  Menu,
  Purchase,
  Supplier,
  Won,
} from './types';

// Demo data from docs/PRODUCT.md "시연 데이터". Change that table first.

const ingredients: Ingredient[] = [
  { id: 'pork-shoulder', name: '돼지고기 앞다리', spec: '국산 냉장', marketCode: 'kamis-pork-shoulder' },
  { id: 'rice', name: '쌀', marketCode: 'kamis-rice' },
  { id: 'onion', name: '양파', marketCode: 'kamis-onion' },
  { id: 'green-onion', name: '대파', marketCode: 'kamis-green-onion' },
  { id: 'jeyuk-sauce', name: '제육 소스' },
  { id: 'kimchi', name: '김치' },
  { id: 'pork-neck', name: '돼지고기 목살', marketCode: 'kamis-pork-neck' },
  { id: 'tofu', name: '두부' },
  { id: 'egg', name: '계란', marketCode: 'kamis-egg' },
  { id: 'carrot', name: '당근', marketCode: 'kamis-carrot' },
  { id: 'cooking-oil', name: '식용유' },
];

const suppliers: Supplier[] = [{ id: 'daesung', name: '대성유통', createdAt: '2026-10-01T00:00:00.000Z' }];

function confirmed(
  ingredientId: string,
  date: string,
  packWeightG: Grams,
  quantity: number,
  amount: Won,
): Purchase {
  return {
    id: `purchase-${ingredientId}-${date}`,
    ingredientId,
    supplierId: 'daesung',
    date,
    packWeightG,
    quantity,
    amount,
    unitPrice: unitPriceFromPack(amount, quantity, packWeightG),
    status: 'confirmed',
  };
}

// Pack sizes and amounts give 3000 / 3000 / 5000 / 13000 / 6000 / 13000 / 4000 / 9000 / 4000 / 7000 won per kg.
const purchases: Purchase[] = [
  confirmed('pork-shoulder', '2026-10-07', 10000, 1, 90000),
  confirmed('pork-shoulder', '2026-10-28', 10000, 1, 100000),
  confirmed('rice', '2026-10-07', 20000, 1, 60000),
  confirmed('onion', '2026-10-07', 15000, 1, 45000),
  confirmed('green-onion', '2026-10-07', 1000, 2, 10000),
  confirmed('jeyuk-sauce', '2026-10-07', 2000, 1, 26000),
  confirmed('kimchi', '2026-10-07', 10000, 1, 60000),
  confirmed('pork-neck', '2026-10-07', 5000, 1, 65000),
  confirmed('tofu', '2026-10-07', 2000, 2, 16000),
  confirmed('egg', '2026-10-07', 10000, 1, 90000),
  confirmed('carrot', '2026-10-07', 10000, 1, 40000),
  confirmed('cooking-oil', '2026-10-07', 18000, 1, 126000),
];

const menus: Menu[] = [
  {
    id: 'jeyuk-deopbap',
    name: '제육덮밥',
    price: 10000,
    servings: 1,
    recipe: [
      { ingredientId: 'pork-shoulder', grams: 200 },
      { ingredientId: 'rice', grams: 100 },
      { ingredientId: 'onion', grams: 50 },
      { ingredientId: 'green-onion', grams: 20 },
      { ingredientId: 'jeyuk-sauce', grams: 50 },
    ],
  },
  {
    id: 'kimchi-jjigae',
    name: '김치찌개',
    price: 9000,
    servings: 1,
    recipe: [
      { ingredientId: 'kimchi', grams: 150 },
      { ingredientId: 'pork-neck', grams: 70 },
      { ingredientId: 'tofu', grams: 100 },
      { ingredientId: 'rice', grams: 100 },
      { ingredientId: 'green-onion', grams: 20 },
      { ingredientId: 'onion', grams: 30 },
    ],
  },
  {
    id: 'gyeran-mari',
    name: '계란말이',
    price: 8000,
    servings: 1,
    recipe: [
      { ingredientId: 'egg', grams: 180 },
      { ingredientId: 'carrot', grams: 30 },
      { ingredientId: 'green-onion', grams: 20 },
      { ingredientId: 'onion', grams: 30 },
      { ingredientId: 'cooking-oil', grams: 10 },
    ],
  },
];

/** Last 4 weeks, first week = 100. Example values, not live KAMIS data. */
const marketIndex: Record<string, MarketIndex> = {
  'pork-shoulder': { mine: [100, 100, 100, 111], market: [100, 99, 98, 97] },
};

const demoExtract: ExtractResult = {
  supplier: '한우리축산',
  date: '2026-11-04',
  items: [
    {
      rawName: '돼지고기 앞다리',
      packWeightG: 10000,
      packUnit: '박스',
      quantity: 1,
      unitPrice: 90000,
      amount: 90000,
      confidence: 'high',
    },
  ],
  total: 90000,
};

export const seed = { ingredients, suppliers, purchases, menus, marketIndex, demoExtract };
