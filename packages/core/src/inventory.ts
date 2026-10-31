import type { Ingredient, Menu, Purchase, Sale } from './types';
import { baseOf, toBase, unitPricePerBase } from './units';

/** Quantities are base units (g, mL, ea); this absorbs float noise from L/kg conversions. */
const EPSILON = 1e-6;

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export function priceHistory(ingredient: Ingredient, purchases: readonly Purchase[]): Purchase[] {
  return purchases
    .filter((p) => p.ingredientId === ingredient.id && p.status === 'confirmed'
      && baseOf(p.packUnit) === ingredient.baseUnit)
    .sort((a, b) => compare(a.date, b.date) || compare(a.id, b.id));
}

/** One purchase as stock. `quantity` and `remaining` are base units. */
export interface Lot {
  purchaseId: string;
  date: string;
  supplierId: string;
  unitPricePerBase: number;
  quantity: number;
  remaining: number;
}

export interface IngredientStock {
  lots: Lot[];
  /** Oldest lot with stock left: the next use draws from it. Null when stock is empty. */
  current: Lot | null;
  /** Lot used up just before `current`, or the one before `last` when stock is empty. */
  previous: Lot | null;
  next: Lot | null;
  /** Newest lot; its price applies when stock is empty. */
  last: Lot | null;
  remaining: number;
}

/** Base quantity of each ingredient used by recorded sales, from the menus' current recipes. */
export function consumption(
  menus: readonly Menu[],
  ingredients: readonly Ingredient[],
  sales: readonly Sale[],
): Map<string, number> {
  const menuById = new Map(menus.map((menu) => [menu.id, menu]));
  const ingredientById = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const used = new Map<string, number>();
  for (const sale of sales) {
    const menu = menuById.get(sale.menuId);
    if (!menu) continue;
    for (const line of menu.recipe) {
      const ingredient = ingredientById.get(line.ingredientId);
      const qty = ingredient ? toBase(line.amount, line.unit, ingredient.baseUnit) : null;
      if (qty === null) continue;
      used.set(line.ingredientId, (used.get(line.ingredientId) ?? 0) + qty * sale.quantity);
    }
  }
  return used;
}

/** First in, first out: `used` is taken from the oldest lots first, regardless of sale dates. */
export function stockOf(ingredient: Ingredient, purchases: readonly Purchase[], used = 0): IngredientStock {
  let left = used;
  const lots = priceHistory(ingredient, purchases).flatMap((purchase): Lot[] => {
    const price = unitPricePerBase(purchase, ingredient.baseUnit);
    const pack = toBase(purchase.packSize, purchase.packUnit, ingredient.baseUnit);
    if (price === null || pack === null) return [];
    const quantity = pack * purchase.quantity;
    const take = Math.min(quantity, left);
    left -= take;
    const remaining = quantity - take > EPSILON ? quantity - take : 0;
    return [{ purchaseId: purchase.id, date: purchase.date, supplierId: purchase.supplierId, unitPricePerBase: price, quantity, remaining }];
  });
  const index = lots.findIndex((lot) => lot.remaining > 0);
  const last = lots.at(-1) ?? null;
  return {
    lots,
    current: index === -1 ? null : lots[index],
    previous: index === -1 ? (lots.at(-2) ?? null) : (lots[index - 1] ?? null),
    next: index === -1 ? null : (lots[index + 1] ?? null),
    last,
    remaining: lots.reduce((sum, lot) => sum + lot.remaining, 0),
  };
}

/**
 * Unrounded cost of drawing `qty` from stock, oldest lots first. A shortfall is priced at
 * the newest lot and reported as `short`. Null when the ingredient was never bought.
 */
export function drawCost(stock: IngredientStock, qty: number): { cost: number; short: boolean } | null {
  if (stock.last === null) return null;
  let need = qty;
  let cost = 0;
  for (const lot of stock.lots) {
    if (need <= EPSILON) break;
    const take = Math.min(lot.remaining, need);
    cost += take * lot.unitPricePerBase;
    need -= take;
  }
  const short = need > EPSILON;
  if (short) cost += need * stock.last.unitPricePerBase;
  return { cost, short };
}

/** Deterministic 0..1 generator (FNV-1a hash into mulberry32), so a reset demo replays the same days. */
export function seededRandom(seedText: string): () => number {
  let hash = 2166136261;
  for (const char of seedText) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  let state = hash >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const SETTLE_RANGE = { min: 3, max: 8 } as const;

export interface SettlementLine {
  menuId: string;
  target: number;
  /** Servings actually made; below `target` when an ingredient ran out. */
  quantity: number;
}

/**
 * One demo day: every menu (by id) draws a target from SETTLE_RANGE seeded by `date`, then
 * servings are made one at a time, round-robin, while every recipe ingredient has stock.
 * Menus with a unit mismatch or an unbought ingredient make nothing.
 */
export function settleDay(
  menus: readonly Menu[],
  ingredients: readonly Ingredient[],
  purchases: readonly Purchase[],
  sales: readonly Sale[],
  date: string,
): SettlementLine[] {
  const used = consumption(menus, ingredients, sales);
  const left = new Map(ingredients.map((ingredient) => [
    ingredient.id,
    stockOf(ingredient, purchases, used.get(ingredient.id) ?? 0).remaining,
  ]));
  const ingredientById = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const random = seededRandom(date);
  const plans = [...menus].sort((a, b) => compare(a.id, b.id)).map((menu) => {
    const needs = menu.recipe.map((line) => {
      const ingredient = ingredientById.get(line.ingredientId);
      const qty = ingredient ? toBase(line.amount, line.unit, ingredient.baseUnit) : null;
      return qty === null ? null : { ingredientId: line.ingredientId, qty };
    });
    const target = SETTLE_RANGE.min + Math.floor(random() * (SETTLE_RANGE.max - SETTLE_RANGE.min + 1));
    return { menuId: menu.id, needs: needs.every((need) => need !== null) ? needs : null, target, quantity: 0 };
  });

  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const plan of plans) {
      if (plan.needs === null || plan.quantity >= plan.target) continue;
      if (!plan.needs.every(({ ingredientId, qty }) => (left.get(ingredientId) ?? 0) + EPSILON >= qty)) continue;
      for (const { ingredientId, qty } of plan.needs) left.set(ingredientId, (left.get(ingredientId) ?? 0) - qty);
      plan.quantity += 1;
      progressed = true;
    }
  }
  return plans.map(({ menuId, target, quantity }) => ({ menuId, target, quantity }));
}

/** The day after the latest recorded sale, or `today` when nothing was sold yet. */
export function nextSettleDate(sales: readonly Sale[], today: string): string {
  const latest = sales.reduce<string | null>((max, sale) => (max === null || sale.date > max ? sale.date : max), null);
  if (latest === null) return today;
  const day = new Date(`${latest}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10);
}

export function soldByMenu(sales: readonly Sale[]): Map<string, number> {
  const sold = new Map<string, number>();
  for (const sale of sales) sold.set(sale.menuId, (sold.get(sale.menuId) ?? 0) + sale.quantity);
  return sold;
}
