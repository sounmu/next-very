import { describe, expect, it } from 'vitest';
import {
  computeMenuCost, costAlert, currentAndPrevious, monthSpend,
  previewWithPrice, priceChanges, priceHistory, ratioPercent,
} from './cost';
import { seed } from './seed';
import type { Ingredient, Menu, Purchase } from './types';

const { menus, ingredients, purchases } = seed;
const jeyuk = menus[0];
const pork = ingredients[0];

function confirmedInvoice(): Purchase {
  const invoice = seed.invoices[0];
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

describe('menu costs', () => {
  it.each([
    ['jeyuk-deopbap', 3200, 3000, 32],
    ['kimchi-jjigae', 2700, null, 30],
    ['gyeran-mari', 2000, null, 25],
    ['cafe-latte', 1140, null, 25],
  ])('prices %s with rounded lines and prior prices', (id, total, previousTotal, percent) => {
    const menu = menus.find((candidate) => candidate.id === id);
    if (!menu) throw new Error(`Missing menu ${id}`);
    const result = computeMenuCost(menu, ingredients, purchases);
    expect(result).toMatchObject({
      total, partialTotal: total, previousTotal, missing: [], unitIssues: [],
    });
    expect(result.ratio).toBe(total / menu.price);
    expect(ratioPercent(total, menu.price)).toBe(percent);
  });

  it('retains precise base prices and rounds each latte ingredient cost', () => {
    const latte = menus[3];
    const result = computeMenuCost(latte, ingredients, purchases);
    expect(result.lines).toMatchObject([
      { baseQty: 250, unitPricePerBase: 2.8, cost: 700, priceDate: '2026-10-30', supplierId: 'hanbit' },
      { baseQty: 18, unitPricePerBase: 24.444, cost: 440 },
    ]);
  });

  it('uses the confirmed demo invoice as the new price and preserves the prior total', () => {
    const purchase = confirmedInvoice();
    const result = computeMenuCost(jeyuk, ingredients, [...purchases, purchase]);
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
    const result = computeMenuCost(jeyuk, ingredients, withoutRice);
    expect(result).toMatchObject({
      total: null, partialTotal: 2900, previousTotal: null, ratio: null,
      missing: ['rice'], unitIssues: [],
    });
    expect(result.lines[1]).toMatchObject({ baseQty: 100, cost: null, issue: 'no-price' });
  });

  it('ignores a later incompatible purchase instead of replacing the confirmed price', () => {
    const wrong: Purchase = { ...purchases[1], id: 'wrong', date: '2026-10-31', packUnit: 'L', amount: 1 };
    const result = computeMenuCost(jeyuk, ingredients, [...purchases, wrong]);
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
    const result = previewWithPrice(jeyuk, ingredients, purchases, pork.id, 9);
    expect(result).toMatchObject({ total: 3000, previousTotal: 3200 });
    expect(result.lines[0]).toMatchObject({ cost: 1800, previousCost: 2000, unitPricePerBase: 9 });
    expect(computeMenuCost(jeyuk, ingredients, purchases).total).toBe(3200);
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
    const changes = priceChanges(ingredients, purchases);
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
    const result = costAlert([...menus, larger], ingredients, purchases);
    expect(result).toEqual({ menuId: 'larger', menuName: '곱빼기', delta: 400, ingredientIds: [pork.id] });
  });

  it('returns no alert after the demo price decrease', () => {
    expect(costAlert(menus, ingredients, [...purchases, confirmedInvoice()])).toBeNull();
  });

  it('sums only October purchases when other months are present', () => {
    const november: Purchase = { ...purchases[0], id: 'november', date: '2026-11-01' };
    expect(monthSpend([...purchases, november], '2026-10')).toBe(786044);
  });

  it('returns zero for a month without purchases', () => {
    expect(monthSpend(purchases, '2026-09')).toBe(0);
  });
});
