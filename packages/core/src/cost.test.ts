import { describe, expect, it } from 'vitest';
import {
  computeMenuCost, costAlert, currentAndPrevious, monthSpend,
  previewWithPrice, priceChanges, ratioPercent,
} from './cost';
import {
  consumption, nextSettleDate, priceHistory, settleDay, SETTLE_RANGE, stockOf,
} from './inventory';
import { seed } from './seed';
import type { Ingredient, Menu, Purchase, Sale } from './types';

const { menus, ingredients, purchases, sales } = seed;
const jeyuk = menus[0];
const pork = ingredients[0];
const used = consumption(menus, ingredients, sales);

function confirmedInvoice(): Purchase {
  const invoice = seed.demoInvoice;
  const item = invoice.extraction.items[0];
  if (item.packSize === null || item.packUnit === null || invoice.supplierId === undefined) {
    throw new Error('Incomplete demo extraction');
  }
  return {
    id: 'confirmed-demo-invoice', ingredientId: 'pork-shoulder', supplierId: invoice.supplierId,
    date: invoice.extraction.date, packSize: item.packSize, packUnit: item.packUnit,
    quantity: item.quantity, amount: item.amount, status: 'confirmed', source: 'receipt',
    invoiceId: invoice.id, rawName: item.rawName,
  };
}

const jeyukSale = (id: string, quantity: number): Sale => ({ id, menuId: jeyuk.id, date: '2026-10-31', quantity });

describe('purchase price history', () => {
  it('sorts matching purchases by date then id without mutating inputs', () => {
    const a: Purchase = { ...purchases[1], id: 'a' };
    const b: Purchase = { ...purchases[1], id: 'b' };
    const wrongDimension: Purchase = { ...b, id: 'c', date: '2026-10-31', packUnit: 'L' };
    const input = [wrongDimension, b, purchases[0], a];
    const history = priceHistory(pork, input);
    expect(history.map((p) => p.id)).toEqual([purchases[0].id, 'a', 'b']);
    expect(input.map((p) => p.id)).toEqual(['c', 'b', purchases[0].id, 'a']);
  });

  it('selects the latest two purchases of the same dimension', () => {
    const result = currentAndPrevious(pork, [...purchases].reverse());
    expect(result.current?.amount).toBe(100000);
    expect(result.previous?.amount).toBe(90000);
  });

  it('returns null prices when no purchase exists', () => {
    expect(currentAndPrevious(pork, [])).toEqual({ current: null, previous: null });
  });
});

describe('stock, first in first out', () => {
  it('leaves 1.6kg of the 10/28 pork lot after the seeded October sales', () => {
    const stock = stockOf(pork, purchases, used.get(pork.id));
    expect(stock.remaining).toBeCloseTo(1600);
    expect(stock.current).toMatchObject({ date: '2026-10-28', unitPricePerBase: 10 });
    expect(stock.previous).toMatchObject({ date: '2026-10-07', unitPricePerBase: 9 });
    expect(stock.next).toBeNull();
  });

  it('draws from the oldest lot first when nothing is used', () => {
    expect(computeMenuCost(jeyuk, ingredients, purchases).lines[0]).toMatchObject({ cost: 1800, priceDate: '2026-10-07' });
  });

  it('splits a serving across two lots when the older one runs out mid-serving', () => {
    const almostGone = new Map(used).set(pork.id, 19900);
    const result = computeMenuCost(jeyuk, ingredients, [...purchases, confirmedInvoice()], almostGone);
    expect(result.lines[0]).toMatchObject({ cost: 1900, priceDate: '2026-10-28', stockShort: false });
    expect(result.total).toBe(3100);
  });

  it('prices a shortfall at the newest lot and flags it when stock is empty', () => {
    const empty = new Map(used).set(pork.id, 20000);
    const result = computeMenuCost(jeyuk, ingredients, purchases, empty);
    expect(result.lines[0]).toMatchObject({ cost: 2000, unitPricePerBase: 10, stockShort: true });
    expect(result.total).toBe(3200);
  });
});

describe('menu costs', () => {
  it.each([
    ['jeyuk-deopbap', 3200, 3000, 32],
    ['kimchi-jjigae', 2700, null, 30],
    ['gyeran-mari', 2000, null, 25],
    ['cafe-latte', 1140, null, 25],
  ])('prices %s with rounded lines and prior prices', (id, total, previousTotal, percent) => {
    const menu = menus.find((candidate) => candidate.id === id);
    if (!menu) throw new Error(`Missing menu ${id}`);
    const result = computeMenuCost(menu, ingredients, purchases, used);
    expect(result).toMatchObject({
      total, partialTotal: total, previousTotal, missing: [], unitIssues: [],
    });
    expect(result.ratio).toBe(total / menu.price);
    expect(ratioPercent(total, menu.price)).toBe(percent);
  });

  it('retains precise base prices and rounds each latte ingredient cost', () => {
    const latte = menus[3];
    const result = computeMenuCost(latte, ingredients, purchases, used);
    expect(result.lines).toMatchObject([
      { baseQty: 250, unitPricePerBase: 2.8, cost: 700, priceDate: '2026-10-30', supplierId: 'hanbit' },
      { baseQty: 18, unitPricePerBase: 24.444, cost: 440 },
    ]);
  });

  it('keeps the old cost after a cheaper receipt until the older stock is used', () => {
    const withReceipt = [...purchases, confirmedInvoice()];
    const right = computeMenuCost(jeyuk, ingredients, withReceipt, used);
    expect(right).toMatchObject({ total: 3200 });
    expect(right.lines[0]).toMatchObject({ supplierId: 'daesung', priceDate: '2026-10-28' });

    const later = consumption(menus, ingredients, [...sales, jeyukSale('eight-more', 8)]);
    const result = computeMenuCost(jeyuk, ingredients, withReceipt, later);
    expect(result).toMatchObject({ total: 3000, previousTotal: 3200 });
    expect(result.lines[0]).toMatchObject({ supplierId: 'hanuri', priceDate: '2026-10-31', cost: 1800 });
    expect(ratioPercent(result.total ?? 0, jeyuk.price)).toBe(30);
  });

  it('flags a recipe dimension mismatch without estimating its cost', () => {
    const menu: Menu = {
      ...jeyuk,
      recipe: jeyuk.recipe.map((line) => line.ingredientId === pork.id ? { ...line, unit: 'mL' } : line),
    };
    const result = computeMenuCost(menu, ingredients, purchases);
    expect(result).toMatchObject({
      total: null, partialTotal: 1200, previousTotal: null, ratio: null,
      missing: [], unitIssues: ['pork-shoulder'],
    });
    expect(result.lines[0]).toMatchObject({ baseQty: null, cost: null, issue: 'unit-mismatch' });
  });

  it('flags a missing price while summing the known costs', () => {
    const withoutRice = purchases.filter((purchase) => purchase.ingredientId !== 'rice');
    const result = computeMenuCost(jeyuk, ingredients, withoutRice, used);
    expect(result).toMatchObject({
      total: null, partialTotal: 2900, previousTotal: null, ratio: null,
      missing: ['rice'], unitIssues: [],
    });
    expect(result.lines[1]).toMatchObject({ baseQty: 100, cost: null, issue: 'no-price' });
  });

  it('ignores a later incompatible purchase instead of replacing the confirmed price', () => {
    const wrong: Purchase = { ...purchases[1], id: 'wrong', date: '2026-10-31', packUnit: 'L', amount: 1 };
    const result = computeMenuCost(jeyuk, ingredients, [...purchases, wrong], used);
    expect(result).toMatchObject({ total: 3200, previousTotal: 3000 });
  });

  it('rounds line costs before adding them', () => {
    const ingredient: Ingredient = { id: 'fraction', name: '분수', baseUnit: 'g', aliases: [] };
    const purchase: Purchase = {
      ...purchases[0], ingredientId: ingredient.id, packSize: 3, packUnit: 'g', quantity: 1, amount: 2,
    };
    const menu: Menu = {
      ...jeyuk, recipe: [
        { ingredientId: ingredient.id, amount: 1, unit: 'g' },
        { ingredientId: ingredient.id, amount: 1, unit: 'g' },
      ],
    };
    const result = computeMenuCost(menu, [ingredient], [purchase]);
    expect(result.total).toBe(2);
  });
});

describe('price previews', () => {
  it('previews pork at nine won per gram without changing actual purchases', () => {
    const before = JSON.stringify(seed);
    const result = previewWithPrice(jeyuk, ingredients, purchases, pork.id, 9, used);
    expect(result).toMatchObject({ total: 3000, previousTotal: 3200 });
    expect(result.lines[0]).toMatchObject({ cost: 1800, previousCost: 2000, unitPricePerBase: 9 });
    expect(computeMenuCost(jeyuk, ingredients, purchases, used).total).toBe(3200);
    expect(JSON.stringify(seed)).toBe(before);
  });

  it('previews a known ingredient without a historical price', () => {
    const withoutPork = purchases.filter((purchase) => purchase.ingredientId !== pork.id);
    const result = previewWithPrice(jeyuk, ingredients, withoutPork, pork.id, 9);
    expect(result).toMatchObject({ total: 3000, previousTotal: null, missing: [] });
  });

  it('does not erase a unit issue with a simulated price', () => {
    const menu: Menu = { ...jeyuk, recipe: [{ ingredientId: pork.id, amount: 200, unit: 'mL' }] };
    const result = previewWithPrice(menu, ingredients, purchases, pork.id, 9);
    expect(result).toMatchObject({ total: null, unitIssues: [pork.id] });
  });
});

describe('dashboard calculations', () => {
  it('reports pork rising from nine to ten won per gram', () => {
    const changes = priceChanges(ingredients, purchases, used);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      ingredientId: pork.id, previousUnitPrice: 9, currentUnitPrice: 10,
      currentDate: '2026-10-28', previousDate: '2026-10-07',
    });
    expect(changes[0].changeRate).toBeCloseTo(0.1111111111);
  });

  it('chooses the menu with the largest positive cost rise', () => {
    const larger: Menu = {
      ...jeyuk, id: 'larger', name: '곱빼기',
      recipe: jeyuk.recipe.map((line) => ({ ...line, amount: line.amount * 2 })),
    };
    const result = costAlert([...menus, larger], ingredients, purchases, used);
    expect(result).toEqual({ menuId: 'larger', menuName: '곱빼기', delta: 400, ingredientIds: [pork.id] });
  });

  it('keeps the alert after a cheaper receipt and drops it once the cheaper stock is in use', () => {
    const withReceipt = [...purchases, confirmedInvoice()];
    expect(costAlert(menus, ingredients, withReceipt, used)?.menuId).toBe(jeyuk.id);
    const later = consumption(menus, ingredients, [...sales, jeyukSale('eight-more', 8)]);
    expect(costAlert(menus, ingredients, withReceipt, later)).toBeNull();
  });

  it('sums only October purchases when other months are present', () => {
    const november: Purchase = { ...purchases[0], id: 'november', date: '2026-11-01' };
    expect(monthSpend([...purchases, november], '2026-10')).toBe(853044);
  });

  it('returns zero for a month without purchases', () => {
    expect(monthSpend(purchases, '2026-09')).toBe(0);
  });
});

describe('daily settlement', () => {
  const withReceipt = [...purchases, confirmedInvoice()];

  it('replays the same day the same way', () => {
    expect(settleDay(menus, ingredients, withReceipt, sales, '2026-10-31'))
      .toEqual(settleDay(menus, ingredients, withReceipt, sales, '2026-10-31'));
  });

  it('draws targets in range and never uses more stock than was bought', () => {
    let all = [...sales];
    let date = nextSettleDate(all, '2026-10-31');
    for (let day = 0; day < 10; day += 1) {
      const lines = settleDay(menus, ingredients, withReceipt, all, date);
      for (const line of lines) {
        expect(line.target).toBeGreaterThanOrEqual(SETTLE_RANGE.min);
        expect(line.target).toBeLessThanOrEqual(SETTLE_RANGE.max);
        expect(line.quantity).toBeLessThanOrEqual(line.target);
      }
      all = [...all, ...lines.filter((line) => line.quantity > 0)
        .map((line) => ({ id: `${date}-${line.menuId}`, menuId: line.menuId, date, quantity: line.quantity }))];
      date = nextSettleDate(all, date);
    }
    const totalUsed = consumption(menus, ingredients, all);
    for (const ingredient of ingredients) {
      const bought = stockOf(ingredient, withReceipt).remaining;
      expect(totalUsed.get(ingredient.id) ?? 0).toBeLessThanOrEqual(bought + 1e-6);
    }
  });

  it('lowers 제육덮밥 only on the second settlement after the cheaper receipt', () => {
    const day1 = settleDay(menus, ingredients, withReceipt, sales, '2026-10-31');
    const after1 = [...sales, ...day1.map((line) => ({ id: `d1-${line.menuId}`, menuId: line.menuId, date: '2026-10-31', quantity: line.quantity }))]
      .filter((sale) => sale.quantity > 0);
    expect(computeMenuCost(jeyuk, ingredients, withReceipt, consumption(menus, ingredients, after1)).total).toBe(3200);

    expect(nextSettleDate(after1, '2026-10-31')).toBe('2026-11-01');
    const day2 = settleDay(menus, ingredients, withReceipt, after1, '2026-11-01');
    const after2 = [...after1, ...day2.map((line) => ({ id: `d2-${line.menuId}`, menuId: line.menuId, date: '2026-11-01', quantity: line.quantity }))]
      .filter((sale) => sale.quantity > 0);
    expect(computeMenuCost(jeyuk, ingredients, withReceipt, consumption(menus, ingredients, after2))).toMatchObject({ total: 3000, previousTotal: 3200 });
  });

  it('starts on the given day when nothing was sold yet', () => {
    expect(nextSettleDate([], '2026-10-31')).toBe('2026-10-31');
    expect(nextSettleDate(sales, '2026-10-31')).toBe('2026-10-31');
  });
});
