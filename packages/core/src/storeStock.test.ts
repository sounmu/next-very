import { describe, expect, it } from 'vitest';
import { presetMenus } from './store';
import { formatStockQty, restoreSale, seedStockOnce, sellOne, sellProblemText, soldOn, withSubject } from './storeStock';

const cafe = presetMenus('cafe');
const latte = cafe.find((menu) => menu.id === 'example-cafe-latte')!;
const vanilla = cafe.find((menu) => menu.id === 'example-cafe-vanilla-latte')!;
const sale = (id: string) => ({ id, date: '2026-11-01' });

describe('demo stock for a new store', () => {
  it('seeds one shared item per ingredient, skips 물, and never duplicates', () => {
    const stock = seedStockOnce([], cafe);
    expect(stock.map((item) => item.name)).toEqual(['원두', '우유', '바닐라시럽']);
    expect(stock.every((item) => item.isDemo && item.quantity === item.initial)).toBe(true);
    const used = [{ ...stock[0], quantity: 500 }, ...stock.slice(1)];
    expect(seedStockOnce(used, cafe)).toEqual(used);
  });

  it('deducts a 카페라테 from the shared stock and undo restores it exactly', () => {
    const stock = seedStockOnce([], cafe);
    const sold = sellOne(stock, latte, sale('s1'));
    if (!sold.ok) throw new Error('expected a sale');
    expect(sold.sale.lines).toEqual([{ name: '원두', quantity: 18 }, { name: '우유', quantity: 200 }]);
    expect(sold.stock.map((item) => formatStockQty(item.quantity, item.baseUnit, item.countLabel))).toEqual(['982g', '4.8L', '100mL']);

    const both = sellOne(sold.stock, vanilla, sale('s2'));
    if (!both.ok) throw new Error('expected a sale');
    expect(both.stock.find((item) => item.name === '우유')?.quantity).toBe(4600);
    expect(restoreSale(both.stock, both.sale)).toEqual(sold.stock);
    expect(soldOn([sold.sale, both.sale], latte.id, '2026-11-01')).toBe(1);
  });

  it('blocks a sale without touching stock when an ingredient runs short', () => {
    let stock = seedStockOnce([], cafe);
    for (let i = 0; i < 5; i += 1) {
      const sold = sellOne(stock, vanilla, sale(`v${i}`));
      if (!sold.ok) throw new Error(`sale ${i} should fit`);
      stock = sold.stock;
    }
    const blocked = sellOne(stock, vanilla, sale('v5'));
    expect(blocked).toEqual({ ok: false, reason: 'short', name: '바닐라시럽' });
    expect(stock.every((item) => item.quantity >= 0)).toBe(true);
    if (!blocked.ok) expect(sellProblemText(blocked)).toBe('바닐라시럽이 부족해요');
  });

  it('names a missing or mismatched ingredient instead of guessing', () => {
    const stock = seedStockOnce([], cafe);
    const extra = { ...latte, recipe: [...latte.recipe, { ingredientName: '시나몬', amount: 1, unit: 'g' as const }] };
    expect(sellOne(stock, extra, sale('x'))).toEqual({ ok: false, reason: 'missing', name: '시나몬' });
    const grams = { ...latte, recipe: [{ ingredientName: '우유', amount: 200, unit: 'g' as const }] };
    expect(sellOne(stock, grams, sale('y'))).toEqual({ ok: false, reason: 'unit', name: '우유' });
  });

  it('formats quantities and Korean subject particles', () => {
    expect(withSubject('우유')).toBe('우유가');
    expect(withSubject('떡')).toBe('떡이');
    expect(formatStockQty(20, 'ea', '장')).toBe('20장');
    expect(formatStockQty(1000, 'g')).toBe('1kg');
  });
});
