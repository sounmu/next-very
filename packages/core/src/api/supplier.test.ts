import { describe, expect, it } from 'vitest';
import { priceHistory } from '../cost';
import { seed } from '../seed';
import type { Quote } from '../types';
import {
  IngredientDetailSchema,
  MarketResponseSchema,
  QuoteCreateResponseSchema,
  QuoteCreateSchema,
  SupplierCreateResponseSchema,
  SupplierCreateSchema,
  SuppliersResponseSchema,
  type IngredientDetail,
} from './supplier';

const { ingredients, suppliers, purchases, menus, marketIndex } = seed;

const pork = ingredients.find((i) => i.id === 'pork-shoulder');
if (!pork) throw new Error('seed ingredient missing: pork-shoulder');

const quote: Quote = {
  id: 'quote-pork-shoulder-hanuri',
  supplierId: 'hanuri',
  ingredientId: 'pork-shoulder',
  unitPrice: 9000,
  packWeightG: 10000,
  terms: '주 2회 배송',
  date: '2026-11-04',
};

const usingPork = menus.filter((m) => m.recipe.some((l) => l.ingredientId === 'pork-shoulder'));
const usedIds = new Set(usingPork.flatMap((m) => m.recipe.map((l) => l.ingredientId)));

const detail: IngredientDetail = {
  ingredient: pork,
  purchases: priceHistory('pork-shoulder', purchases),
  suppliers,
  latestBySupplier: [{ supplierId: 'daesung', unitPrice: 10000, date: '2026-10-28' }],
  quotes: [quote],
  menus: usingPork,
  allPurchases: purchases.filter((p) => p.status === 'confirmed' && usedIds.has(p.ingredientId)),
};

describe('IngredientDetailSchema', () => {
  it('accepts a detail built from the seed', () => {
    expect(IngredientDetailSchema.safeParse(detail).success).toBe(true);
    expect(detail.menus.map((m) => m.id)).toEqual(['jeyuk-deopbap']);
    expect(detail.purchases.map((p) => p.date)).toEqual(['2026-10-07', '2026-10-28']);
  });

  it('rejects a latestBySupplier row without a date', () => {
    const bad = { ...detail, latestBySupplier: [{ supplierId: 'daesung', unitPrice: 10000 }] };
    expect(IngredientDetailSchema.safeParse(bad).success).toBe(false);
  });
});

describe('MarketResponseSchema', () => {
  const index = marketIndex['pork-shoulder'];
  if (!index) throw new Error('seed market index missing: pork-shoulder');

  it('accepts the available shape built from the seed index', () => {
    const response = {
      available: true,
      source: 'KAMIS 예시',
      isExample: true,
      weeks: index.mine.map((mine, i) => ({ week: i + 1, mine, market: index.market[i] })),
    };
    expect(MarketResponseSchema.safeParse(response).success).toBe(true);
  });

  it('accepts { available: false }', () => {
    expect(MarketResponseSchema.safeParse({ available: false }).success).toBe(true);
  });

  it('rejects available: true without weeks', () => {
    expect(MarketResponseSchema.safeParse({ available: true, source: 'x', isExample: true }).success).toBe(false);
  });
});

describe('suppliers and quotes responses', () => {
  it('accepts GET /api/suppliers', () => {
    expect(SuppliersResponseSchema.safeParse({ suppliers }).success).toBe(true);
  });

  it('accepts POST /api/suppliers response', () => {
    const [supplier] = suppliers;
    expect(SupplierCreateResponseSchema.safeParse({ supplier }).success).toBe(true);
  });

  it('accepts POST /api/quotes response', () => {
    expect(QuoteCreateResponseSchema.safeParse({ quote }).success).toBe(true);
  });
});

describe('request schemas', () => {
  it('SupplierCreateSchema rejects a blank name', () => {
    expect(SupplierCreateSchema.safeParse({ name: '   ' }).success).toBe(false);
    expect(SupplierCreateSchema.safeParse({ name: '한우리축산' }).success).toBe(true);
  });

  it('QuoteCreateSchema rejects a zero price and a malformed date', () => {
    const valid = {
      supplierId: 'hanuri',
      ingredientId: 'pork-shoulder',
      unitPrice: 9000,
      packWeightG: 10000,
      date: '2026-11-04',
    };
    expect(QuoteCreateSchema.safeParse(valid).success).toBe(true);
    expect(QuoteCreateSchema.safeParse({ ...valid, unitPrice: 0 }).success).toBe(false);
    expect(QuoteCreateSchema.safeParse({ ...valid, date: '11/04' }).success).toBe(false);
  });
});
