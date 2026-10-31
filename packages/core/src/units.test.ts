import { describe, expect, it } from 'vitest';
import { formatDateFull, formatDateKo, formatQty, formatUnitPrice, formatWon, unitLabel } from './format';
import { seed } from './seed';
import type { BaseUnit, Unit } from './types';
import { baseOf, isUnit, purchaseBaseQty, toBase, unitPricePerBase } from './units';

describe('unit dimensions', () => {
  it.each<{ value: number; unit: Unit; base: BaseUnit; expected: number | null }>([
    { value: 1.5, unit: 'kg', base: 'g', expected: 1500 },
    { value: 12, unit: 'L', base: 'mL', expected: 12000 },
    { value: 2, unit: 'ea', base: 'ea', expected: 2 },
    { value: 18, unit: 'g', base: 'g', expected: 18 },
    { value: 250, unit: 'mL', base: 'mL', expected: 250 },
    { value: 1, unit: 'g', base: 'mL', expected: null },
    { value: 1, unit: 'mL', base: 'g', expected: null },
    { value: 1, unit: 'ea', base: 'g', expected: null },
  ])('converts $value $unit into $base only within a dimension', ({ value, unit, base, expected }) => {
    expect(toBase(value, unit, base)).toBe(expected);
  });

  it.each<[Unit, BaseUnit]>([['g', 'g'], ['kg', 'g'], ['mL', 'mL'], ['L', 'mL'], ['ea', 'ea']])(
    'maps %s to base %s', (unit, base) => {
      expect(baseOf(unit)).toBe(base);
    },
  );

  it.each(['g', 'kg', 'mL', 'L', 'ea'])('recognizes supported unit %s', (unit) => {
    expect(isUnit(unit)).toBe(true);
  });

  it.each(['ml', '개', 'box', '', null, 1])('rejects unsupported unit %s', (unit) => {
    expect(isUnit(unit)).toBe(false);
  });

  it('derives milk base quantity and unrounded unit price from the line total', () => {
    const milk = seed.purchases.find((purchase) => purchase.ingredientId === 'milk');
    if (!milk) throw new Error('Missing milk purchase');
    expect(purchaseBaseQty(milk, 'mL')).toBe(12000);
    expect(unitPricePerBase(milk, 'mL')).toBe(2.8);
    expect(purchaseBaseQty(milk, 'g')).toBeNull();
    expect(unitPricePerBase(milk, 'g')).toBeNull();
  });
});

describe('Korean domain formatting', () => {
  it.each<[number, BaseUnit, string]>([
    [10, 'g', '100g당 1,000원'],
    [2.8, 'mL', '100mL당 280원'],
    [50, 'ea', '개당 50원'],
    [24.444, 'g', '100g당 2,444원'],
    [50.6, 'ea', '개당 51원'],
  ])('formats %s won per %s', (price, base, expected) => {
    expect(formatUnitPrice(price, base)).toBe(expected);
  });

  it.each<[number, Unit, string]>([
    [250, 'mL', '250mL'], [18, 'g', '18g'], [1.5, 'kg', '1.5kg'], [2, 'ea', '2개'], [1, 'L', '1L'],
  ])('formats quantity %s %s', (value, unit, expected) => {
    expect(formatQty(value, unit)).toBe(expected);
  });

  it('labels count units in Korean', () => {
    expect(unitLabel('ea')).toBe('개');
    expect(unitLabel('kg')).toBe('kg');
  });

  it('formats won with thousands separators', () => {
    expect(formatWon(1234)).toBe('1,234원');
  });

  it('formats dates without timezone conversion', () => {
    expect(formatDateKo('2026-10-28')).toBe('10월 28일');
    expect(formatDateKo('2026-01-02')).toBe('1월 2일');
    expect(formatDateFull('2026-10-28')).toBe('2026.10.28');
  });
});
