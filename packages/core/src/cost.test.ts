import { describe, expect, it } from 'vitest';
import {
  computeMenuCost,
  costAlert,
  currentAndPrevious,
  previewWithPrice,
  priceHistory,
  ratioPercent,
  unitPriceFromPack,
} from './cost';
import { MenusResponseSchema } from './schemas';
import { seed } from './seed';
import type { Menu, Purchase } from './types';

const { menus, purchases } = seed;

function menu(id: string): Menu {
  const found = menus.find((m) => m.id === id);
  if (!found) throw new Error(`seed menu missing: ${id}`);
  return found;
}

const jeyuk = menu('jeyuk-deopbap');
const kimchiJjigae = menu('kimchi-jjigae');
const gyeranMari = menu('gyeran-mari');

const novemberPurchase: Purchase = {
  id: 'purchase-pork-shoulder-2026-11-04',
  ingredientId: 'pork-shoulder',
  supplierId: 'hanuri',
  date: '2026-11-04',
  packWeightG: 10000,
  quantity: 1,
  amount: 90000,
  unitPrice: unitPriceFromPack(90000, 1, 10000),
  status: 'confirmed',
};

describe('unitPriceFromPack', () => {
  it('converts a pack price to won per kg', () => {
    expect(unitPriceFromPack(90000, 1, 10000)).toBe(9000);
    expect(unitPriceFromPack(10000, 2, 1000)).toBe(5000);
  });

  it('rounds to a whole won', () => {
    expect(unitPriceFromPack(10000, 1, 3000)).toBe(3333);
  });
});

describe('seed purchases', () => {
  it('stores the unit price each purchase implies', () => {
    for (const p of purchases) {
      expect(p.unitPrice).toBe(unitPriceFromPack(p.amount, p.quantity, p.packWeightG));
    }
  });
});

describe('priceHistory / currentAndPrevious', () => {
  it('sorts confirmed purchases by date ascending', () => {
    const shuffled = [...purchases].reverse();
    expect(priceHistory('pork-shoulder', shuffled).map((p) => p.date)).toEqual(['2026-10-07', '2026-10-28']);
  });

  it('ignores pending purchases', () => {
    const pending: Purchase = { ...novemberPurchase, status: 'pending' };
    expect(priceHistory('pork-shoulder', [...purchases, pending])).toHaveLength(2);
  });

  it('breaks date ties by id', () => {
    const a: Purchase = { ...novemberPurchase, id: 'a' };
    const b: Purchase = { ...novemberPurchase, id: 'b' };
    expect(priceHistory('pork-shoulder', [b, a]).map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('returns current and previous, or null', () => {
    const pork = currentAndPrevious('pork-shoulder', purchases);
    expect(pork.current?.unitPrice).toBe(10000);
    expect(pork.previous?.unitPrice).toBe(9000);

    const rice = currentAndPrevious('rice', purchases);
    expect(rice.current?.unitPrice).toBe(3000);
    expect(rice.previous).toBeNull();

    expect(currentAndPrevious('saffron', purchases)).toEqual({ current: null, previous: null });
  });
});

describe('computeMenuCost with demo data', () => {
  it('제육덮밥 costs 3,200 (32%) after the 10/28 price rise, 3,000 before', () => {
    const cost = computeMenuCost(jeyuk, purchases);
    expect(cost.total).toBe(3200);
    expect(ratioPercent(cost.total ?? 0, jeyuk.price)).toBe(32);
    expect(cost.ratio).toBeCloseTo(0.32);
    expect(cost.previousTotal).toBe(3000);
    expect(cost.missing).toEqual([]);
    const pork = cost.lines.find((l) => l.ingredientId === 'pork-shoulder');
    expect(pork).toMatchObject({ unitPrice: 10000, supplierId: 'daesung', cost: 2000, previousCost: 1800 });
  });

  it('제육덮밥 drops to 3,000 after the confirmed 11/04 purchase', () => {
    const cost = computeMenuCost(jeyuk, [...purchases, novemberPurchase]);
    expect(cost.total).toBe(3000);
    expect(cost.previousTotal).toBe(3200);
    expect(ratioPercent(cost.total ?? 0, jeyuk.price)).toBe(30);
    const pork = cost.lines.find((l) => l.ingredientId === 'pork-shoulder');
    expect(pork?.supplierId).toBe('hanuri');
  });

  it('김치찌개 costs 2,700 with no previous total', () => {
    const cost = computeMenuCost(kimchiJjigae, purchases);
    expect(cost.total).toBe(2700);
    expect(cost.previousTotal).toBeNull();
    expect(ratioPercent(cost.total ?? 0, kimchiJjigae.price)).toBe(30);
  });

  it('계란말이 costs 2,000 (25%)', () => {
    const cost = computeMenuCost(gyeranMari, purchases);
    expect(cost.total).toBe(2000);
    expect(ratioPercent(cost.total ?? 0, gyeranMari.price)).toBe(25);
  });

  it('does not count a pending purchase', () => {
    const pending: Purchase = { ...novemberPurchase, status: 'pending' };
    expect(computeMenuCost(jeyuk, [...purchases, pending]).total).toBe(3200);
  });
});

describe('computeMenuCost with a missing price', () => {
  it('returns a null total and lists the ingredient', () => {
    const withSaffron: Menu = {
      ...gyeranMari,
      recipe: [...gyeranMari.recipe, { ingredientId: 'saffron', grams: 1 }],
    };
    const cost = computeMenuCost(withSaffron, purchases);
    expect(cost.total).toBeNull();
    expect(cost.ratio).toBeNull();
    expect(cost.previousTotal).toBeNull();
    expect(cost.missing).toEqual(['saffron']);
    expect(cost.lines.find((l) => l.ingredientId === 'saffron')).toMatchObject({ unitPrice: null, cost: null });
  });
});

describe('previewWithPrice', () => {
  it('shows 3,000 for a 9,000 won/kg pork price without touching the real cost', () => {
    const before = JSON.stringify(purchases);
    const preview = previewWithPrice(jeyuk, purchases, 'pork-shoulder', 9000);
    expect(preview.total).toBe(3000);
    expect(preview.previousTotal).toBe(3200);
    expect(ratioPercent(preview.total ?? 0, jeyuk.price)).toBe(30);

    expect(computeMenuCost(jeyuk, purchases).total).toBe(3200);
    expect(JSON.stringify(purchases)).toBe(before);
  });

  it('prices an ingredient that has no confirmed purchase', () => {
    const withSaffron: Menu = { ...gyeranMari, recipe: [...gyeranMari.recipe, { ingredientId: 'saffron', grams: 1 }] };
    const preview = previewWithPrice(withSaffron, purchases, 'saffron', 1000);
    expect(preview.total).toBe(2001);
    expect(preview.previousTotal).toBeNull();
  });
});

describe('costAlert', () => {
  it('flags 제육덮밥 with a 200 won rise from pork', () => {
    expect(costAlert(menus, purchases)).toEqual({
      menuId: 'jeyuk-deopbap',
      menuName: '제육덮밥',
      delta: 200,
      ingredientIds: ['pork-shoulder'],
    });
  });

  it('returns null once the price has come back down', () => {
    expect(costAlert(menus, [...purchases, novemberPurchase])).toBeNull();
  });
});

describe('MenusResponseSchema', () => {
  it('accepts a response built from the seed', () => {
    const response = {
      menus: menus.map((m) => ({ menu: m, cost: computeMenuCost(m, purchases), hasPendingQuote: false })),
      alert: costAlert(menus, purchases),
    };
    expect(MenusResponseSchema.safeParse(response).success).toBe(true);
  });
});
