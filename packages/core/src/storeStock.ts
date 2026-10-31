import { z } from 'zod';
import { BaseUnitSchema, IsoDateSchema } from './schemas';
import type { StoreMenu } from './store';
import type { BaseUnit } from './types';
import { toBase } from './units';

/** Not tracked as stock: tap water is not bought by the pack. */
export const NOT_STOCKED: readonly string[] = ['물'];

/** Demo starting stock per ingredient name, in base units. Shared by every menu that uses the name. */
const DEMO_STOCK: Record<string, { quantity: number; baseUnit: BaseUnit; countLabel?: string }> = {
  스파게티면: { quantity: 3000, baseUnit: 'g' },
  마늘: { quantity: 500, baseUnit: 'g' },
  올리브오일: { quantity: 1000, baseUnit: 'mL' },
  페페론치노: { quantity: 50, baseUnit: 'g' },
  토마토소스: { quantity: 2000, baseUnit: 'g' },
  양파: { quantity: 1000, baseUnit: 'g' },
  생크림: { quantity: 1000, baseUnit: 'mL' },
  우유: { quantity: 5000, baseUnit: 'mL' },
  베이컨: { quantity: 500, baseUnit: 'g' },
  원두: { quantity: 1000, baseUnit: 'g' },
  바닐라시럽: { quantity: 100, baseUnit: 'mL' },
  떡: { quantity: 2000, baseUnit: 'g' },
  어묵: { quantity: 1000, baseUnit: 'g' },
  고추장: { quantity: 500, baseUnit: 'g' },
  설탕: { quantity: 500, baseUnit: 'g' },
  대파: { quantity: 300, baseUnit: 'g' },
  밥: { quantity: 3000, baseUnit: 'g' },
  김: { quantity: 20, baseUnit: 'ea', countLabel: '장' },
  단무지: { quantity: 500, baseUnit: 'g' },
  당근: { quantity: 500, baseUnit: 'g' },
  햄: { quantity: 500, baseUnit: 'g' },
  라면: { quantity: 10, baseUnit: 'ea', countLabel: '봉' },
};

export const StockItemSchema = z.object({
  name: z.string().min(1),
  baseUnit: BaseUnitSchema,
  quantity: z.number().nonnegative(),
  initial: z.number().nonnegative(),
  countLabel: z.string().min(1).optional(),
  isDemo: z.boolean(),
});
export type StockItem = z.infer<typeof StockItemSchema>;

/** One 판매 +1. `lines` is what was deducted, so undo restores it even after a recipe edit. */
export const StoreSaleSchema = z.object({
  id: z.string().min(1),
  menuId: z.string().min(1),
  date: IsoDateSchema,
  lines: z.array(z.object({ name: z.string().min(1), quantity: z.number().positive() })),
});
export type StoreSale = z.infer<typeof StoreSaleSchema>;

/** Quantities are base units; this absorbs float noise from L/kg recipe amounts. */
const EPSILON = 1e-6;
const clean = (value: number) => Math.max(0, Math.round(value * 1e6) / 1e6);

export function seedStockOnce(stock: readonly StockItem[], menus: readonly StoreMenu[]): StockItem[] {
  const names = new Set(stock.map((item) => item.name));
  const added: StockItem[] = [];
  for (const line of menus.flatMap((menu) => menu.recipe)) {
    const name = line.ingredientName.trim();
    const preset = DEMO_STOCK[name];
    if (NOT_STOCKED.includes(name) || names.has(name) || !preset) continue;
    names.add(name);
    added.push({ name, ...preset, initial: preset.quantity, isDemo: true });
  }
  return [...stock, ...added];
}

export type SellProblem = { reason: 'short' | 'missing' | 'unit'; name: string };
export type SellResult = { ok: true; stock: StockItem[]; sale: StoreSale } | ({ ok: false } & SellProblem);

/** Deducts one serving, or changes nothing when any ingredient is missing, in another unit, or short. */
export function sellOne(stock: readonly StockItem[], menu: StoreMenu, sale: { id: string; date: string }): SellResult {
  const needs = new Map<string, number>();
  for (const line of menu.recipe) {
    const name = line.ingredientName.trim();
    if (NOT_STOCKED.includes(name)) continue;
    const item = stock.find((candidate) => candidate.name === name);
    if (!item) return { ok: false, reason: 'missing', name };
    const qty = toBase(line.amount, line.unit, item.baseUnit);
    if (qty === null) return { ok: false, reason: 'unit', name };
    needs.set(name, (needs.get(name) ?? 0) + qty);
  }
  for (const [name, qty] of needs) {
    const item = stock.find((candidate) => candidate.name === name);
    if (!item || item.quantity + EPSILON < qty) return { ok: false, reason: 'short', name };
  }
  return {
    ok: true,
    stock: stock.map((item) => {
      const qty = needs.get(item.name);
      return qty === undefined ? item : { ...item, quantity: clean(item.quantity - qty) };
    }),
    sale: { ...sale, menuId: menu.id, lines: [...needs].map(([name, quantity]) => ({ name, quantity })) },
  };
}

export function restoreSale(stock: readonly StockItem[], sale: StoreSale): StockItem[] {
  return stock.map((item) => {
    const line = sale.lines.find((candidate) => candidate.name === item.name);
    return line ? { ...item, quantity: clean(item.quantity + line.quantity) } : item;
  });
}

export function soldOn(sales: readonly StoreSale[], menuId: string, date: string): number {
  return sales.filter((sale) => sale.menuId === menuId && sale.date === date).length;
}

/** "우유가", "떡이": the subject particle follows the last syllable's final consonant. */
export function withSubject(name: string): string {
  const code = name.charCodeAt(name.length - 1) - 0xac00;
  const hasFinal = code >= 0 && code <= 11171 && code % 28 !== 0;
  return `${name}${hasFinal ? '이' : '가'}`;
}

export function sellProblemText({ reason, name }: SellProblem): string {
  if (reason === 'short') return `${withSubject(name)} 부족해요`;
  if (reason === 'missing') return `${name} 재고가 없어요`;
  return `${name} 단위가 재고와 달라요`;
}

const trim = (value: number) => String(Number(value.toFixed(2)));

/** 982g, 1kg, 4.8L, 18장. */
export function formatStockQty(quantity: number, baseUnit: BaseUnit, countLabel?: string): string {
  if (baseUnit === 'ea') return `${trim(quantity)}${countLabel ?? '개'}`;
  if (quantity >= 1000) return `${trim(quantity / 1000)}${baseUnit === 'g' ? 'kg' : 'L'}`;
  return `${trim(quantity)}${baseUnit}`;
}
