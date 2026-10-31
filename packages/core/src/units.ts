import type { BaseUnit, Purchase, Unit } from './types';

export type { BaseUnit, Unit } from './types';

const bases = { g: 'g', kg: 'g', mL: 'mL', L: 'mL', ea: 'ea' } as const;
const factors = { g: 1, kg: 1000, mL: 1, L: 1000, ea: 1 } as const;

export function baseOf(unit: Unit): BaseUnit {
  return bases[unit];
}

export function toBase(value: number, unit: Unit, baseUnit: BaseUnit): number | null {
  return baseOf(unit) === baseUnit ? value * factors[unit] : null;
}

export function isUnit(value: unknown): value is Unit {
  return value === 'g' || value === 'kg' || value === 'mL' || value === 'L' || value === 'ea';
}

export function purchaseBaseQty(purchase: Purchase, baseUnit: BaseUnit): number | null {
  const packBaseQty = toBase(purchase.packSize, purchase.packUnit, baseUnit);
  return packBaseQty === null ? null : packBaseQty * purchase.quantity;
}

export function unitPricePerBase(purchase: Purchase, baseUnit: BaseUnit): number | null {
  const baseQty = purchaseBaseQty(purchase, baseUnit);
  return baseQty === null ? null : purchase.amount / baseQty;
}
