import { describe, expect, it } from 'vitest';
import { compareOffers } from '../compare';
import { computeMenuCost, costAlert, monthSpend } from '../cost';
import { consumption, nextSettleDate, settleDay } from '../inventory';
import { toBase } from '../units';
import type { Purchase, Sale } from '../types';
import { getPreset, PRESETS } from './index';
import type { Preset, PresetId } from './types';

interface Story {
  id: PresetId;
  /** Menu id -> [total, previousTotal] after the October sales. */
  costs: Record<string, [number, number | null]>;
  keyMenu: string;
  keyIngredient: string;
  octoberTotal: number;
  cheapProduct: string;
  /** Settlement on which the key menu drops to its previous cost. */
  dropOn: number;
}

const stories: Story[] = [
  {
    id: 'pasta',
    costs: { 'aglio-olio': [740, null], 'tomato-pasta': [1260, null], 'cream-pasta': [2130, 1930] },
    keyMenu: 'cream-pasta', keyIngredient: 'cream', octoberTotal: 377600,
    cheapProduct: 'product-cream-dairy-direct', dropOn: 2,
  },
  {
    id: 'pizza',
    costs: { margherita: [4570, 4170], 'pepperoni-pizza': [5200, 4900], 'gorgonzola-pizza': [5000, 4800] },
    keyMenu: 'margherita', keyIngredient: 'mozzarella', octoberTotal: 742000,
    cheapProduct: 'product-mozzarella-cheese-market', dropOn: 2,
  },
  {
    id: 'gimbap',
    costs: { 'basic-gimbap': [1260, null], 'tuna-gimbap': [1600, 1400], tteokbokki: [1490, null] },
    keyMenu: 'tuna-gimbap', keyIngredient: 'tuna', octoberTotal: 897000,
    cheapProduct: 'product-tuna-sea-food', dropOn: 2,
  },
];

function confirmedInvoice(preset: Preset, ingredientId: string): Purchase {
  const invoice = preset.demoInvoice;
  const item = invoice.extraction.items[0];
  if (item.packSize === null || item.packUnit === null || invoice.supplierId === undefined) {
    throw new Error('Incomplete demo extraction');
  }
  return {
    id: 'confirmed-demo-invoice', ingredientId, supplierId: invoice.supplierId,
    date: invoice.extraction.date, packSize: item.packSize, packUnit: item.packUnit,
    quantity: item.quantity, amount: item.amount, status: 'confirmed', source: 'receipt',
    invoiceId: invoice.id, rawName: item.rawName,
  };
}

describe('preset registry', () => {
  it('lists every preset under its own id', () => {
    expect(Object.keys(PRESETS)).toEqual(['hankki', 'pasta', 'pizza', 'gimbap']);
    for (const [id, preset] of Object.entries(PRESETS)) expect(getPreset(preset.id).id).toBe(id);
  });
});

describe.each(stories)('$id preset', (story) => {
  const preset = getPreset(story.id);
  const { ingredients, menus, purchases, sales, products } = preset;
  const used = consumption(menus, ingredients, sales);
  const keyMenu = menus.find((menu) => menu.id === story.keyMenu);
  const keyIngredient = ingredients.find((ingredient) => ingredient.id === story.keyIngredient);
  if (!keyMenu || !keyIngredient) throw new Error('Missing key menu or ingredient');
  const withReceipt = [...purchases, confirmedInvoice(preset, keyIngredient.id)];

  it('prices every menu after the October sales', () => {
    expect(Object.fromEntries(menus.map((menu) => {
      const { total, previousTotal } = computeMenuCost(menu, ingredients, purchases, used);
      return [menu.id, [total, previousTotal]];
    }))).toEqual(story.costs);
  });

  it('alerts on the key menu', () => {
    const [total, previousTotal] = story.costs[story.keyMenu];
    expect(costAlert(menus, ingredients, purchases, used)).toEqual({
      menuId: keyMenu.id, menuName: keyMenu.name, delta: total - (previousTotal ?? total),
      ingredientIds: [keyIngredient.id],
    });
  });

  it('sums the October purchases', () => {
    expect(monthSpend(purchases, '2026-10')).toBe(story.octoberTotal);
  });

  it('recommends the cheap supplier for the last purchase quantity', () => {
    const last = purchases.filter((purchase) => purchase.ingredientId === keyIngredient.id)
      .reduce((a, b) => (b.date > a.date ? b : a));
    const pack = toBase(last.packSize, last.packUnit, keyIngredient.baseUnit) ?? 0;
    expect(compareOffers(keyIngredient, products, pack * last.quantity).recommendedId).toBe(story.cheapProduct);
    expect(products.find((product) => product.id === story.cheapProduct)?.supplierId).toBe(preset.demoInvoice.supplierId);
  });

  it(`keeps the key cost after the cheaper receipt and drops it on settlement ${story.dropOn}`, () => {
    const [total, previousTotal] = story.costs[story.keyMenu];
    const keyCost = (all: readonly Sale[]) => computeMenuCost(keyMenu, ingredients, withReceipt, consumption(menus, ingredients, all)).total;
    expect(keyCost(sales)).toBe(total);

    let all: Sale[] = [...sales];
    let date = nextSettleDate(all, '2026-10-31');
    expect(date).toBe('2026-10-31');
    for (let day = 1; day <= story.dropOn; day += 1) {
      const lines = settleDay(menus, ingredients, withReceipt, all, date);
      const key = lines.find((line) => line.menuId === keyMenu.id);
      expect(key?.quantity).toBe(key?.target);
      all = [...all, ...lines.filter((line) => line.quantity > 0)
        .map((line) => ({ id: `${date}-${line.menuId}`, menuId: line.menuId, date, quantity: line.quantity }))];
      expect(keyCost(all)).toBe(day < story.dropOn ? total : previousTotal);
      date = nextSettleDate(all, date);
    }
  });

  it('uses unique ids and resolvable references', () => {
    const ids = [
      ...ingredients, ...preset.suppliers, ...purchases, ...menus, ...products, ...sales, preset.demoInvoice,
    ].map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);

    const ingredientIds = new Set(ingredients.map((row) => row.id));
    const supplierIds = new Set(preset.suppliers.map((row) => row.id));
    const menuIds = new Set(menus.map((row) => row.id));
    for (const row of [...purchases, ...products]) {
      expect(ingredientIds).toContain(row.ingredientId);
      expect(supplierIds).toContain(row.supplierId);
    }
    for (const line of menus.flatMap((menu) => menu.recipe)) expect(ingredientIds).toContain(line.ingredientId);
    for (const sale of sales) expect(menuIds).toContain(sale.menuId);
    expect(supplierIds).toContain(preset.demoInvoice.supplierId);
    for (const id of Object.keys(preset.marketIndex)) expect(ingredientIds).toContain(id);
  });
});
