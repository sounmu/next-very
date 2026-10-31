import { drawCost, priceHistory, stockOf } from './inventory';
import type {
  CostAlert, Ingredient, Menu, MenuCost, MenuCostLine, PriceChange, Purchase, Won,
} from './types';
import { toBase } from './units';

/** Base quantity already used per ingredient id, from `consumption()`. */
export type Usage = ReadonlyMap<string, number>;
const NO_USAGE: Usage = new Map();

export function currentAndPrevious(
  ingredient: Ingredient,
  purchases: readonly Purchase[],
): { current: Purchase | null; previous: Purchase | null } {
  const history = priceHistory(ingredient, purchases);
  return { current: history.at(-1) ?? null, previous: history.at(-2) ?? null };
}

export function ratioPercent(total: Won, price: Won): number {
  return Math.round(total / price * 100);
}

function assemble(menu: Menu, lines: MenuCostLine[]): MenuCost {
  const partialTotal = lines.reduce((sum, line) => sum + (line.cost ?? 0), 0);
  const total = lines.every((line) => line.cost !== null) ? partialTotal : null;
  return {
    menuId: menu.id,
    total,
    partialTotal,
    ratio: total === null ? null : total / menu.price,
    previousTotal: total === null || !lines.some((line) => line.previousCost !== null)
      ? null
      : lines.reduce((sum, line) => sum + (line.previousCost ?? line.cost ?? 0), 0),
    lines,
    missing: lines.filter((line) => line.issue === 'no-price').map((line) => line.ingredientId),
    unitIssues: lines.filter((line) => line.issue === 'unit-mismatch').map((line) => line.ingredientId),
  };
}

/**
 * First in, first out: each line is priced from the oldest stock left after `used`, split
 * across lots when one runs out mid-serving. "Previous" is the lot used up just before.
 */
export function computeMenuCost(
  menu: Menu,
  ingredients: readonly Ingredient[],
  purchases: readonly Purchase[],
  used: Usage = NO_USAGE,
): MenuCost {
  const lines = menu.recipe.map((line): MenuCostLine => {
    const ingredient = ingredients.find((item) => item.id === line.ingredientId);
    const baseQty = ingredient ? toBase(line.amount, line.unit, ingredient.baseUnit) : null;
    const stock = ingredient ? stockOf(ingredient, purchases, used.get(ingredient.id) ?? 0) : null;
    const lot = stock?.current ?? stock?.last ?? null;
    const draw = stock && baseQty !== null ? drawCost(stock, baseQty) : null;
    const previous = stock?.previous ?? null;
    return {
      ...line,
      baseQty,
      unitPricePerBase: lot?.unitPricePerBase ?? null,
      priceDate: lot?.date ?? null,
      supplierId: lot?.supplierId ?? null,
      cost: draw === null ? null : Math.round(draw.cost),
      previousCost: baseQty === null || previous === null ? null : Math.round(baseQty * previous.unitPricePerBase),
      issue: ingredient && baseQty === null ? 'unit-mismatch' : lot === null ? 'no-price' : null,
      stockShort: draw?.short ?? false,
    };
  });
  return assemble(menu, lines);
}

/** Simulates a base-unit price without mutating purchases or recipes. */
export function previewWithPrice(
  menu: Menu,
  ingredients: readonly Ingredient[],
  purchases: readonly Purchase[],
  ingredientId: string,
  price: number,
  used: Usage = NO_USAGE,
): MenuCost {
  const real = computeMenuCost(menu, ingredients, purchases, used);
  const lines = real.lines.map((line): MenuCostLine => {
    if (line.ingredientId !== ingredientId || line.baseQty === null) {
      return { ...line, previousCost: line.cost };
    }
    return {
      ...line,
      unitPricePerBase: price,
      supplierId: null,
      priceDate: null,
      cost: Math.round(line.baseQty * price),
      previousCost: line.cost,
      issue: null,
      stockShort: false,
    };
  });
  return { ...assemble(menu, lines), previousTotal: real.total };
}

/** Price of the stock in use against the lot used up before it. */
export function priceChanges(
  ingredients: readonly Ingredient[],
  purchases: readonly Purchase[],
  used: Usage = NO_USAGE,
): PriceChange[] {
  return ingredients.flatMap((ingredient) => {
    const stock = stockOf(ingredient, purchases, used.get(ingredient.id) ?? 0);
    const current = stock.current ?? stock.last;
    const previous = stock.previous;
    if (current === null || previous === null) return [];
    return [{
      ingredientId: ingredient.id,
      previousUnitPrice: previous.unitPricePerBase,
      currentUnitPrice: current.unitPricePerBase,
      changeRate: current.unitPricePerBase / previous.unitPricePerBase - 1,
      currentDate: current.date,
      previousDate: previous.date,
    }];
  });
}

export function costAlert(
  menus: readonly Menu[],
  ingredients: readonly Ingredient[],
  purchases: readonly Purchase[],
  used: Usage = NO_USAGE,
): CostAlert | null {
  const increased = new Set(priceChanges(ingredients, purchases, used)
    .filter((change) => change.changeRate > 0).map((change) => change.ingredientId));
  let best: CostAlert | null = null;
  for (const menu of menus) {
    const { total, previousTotal } = computeMenuCost(menu, ingredients, purchases, used);
    if (total === null || previousTotal === null) continue;
    const delta = total - previousTotal;
    if (delta <= 0 || (best !== null && delta <= best.delta)) continue;
    best = {
      menuId: menu.id,
      menuName: menu.name,
      delta,
      ingredientIds: [...new Set(menu.recipe.map((line) => line.ingredientId).filter((id) => increased.has(id)))],
    };
  }
  return best;
}

export function monthSpend(purchases: readonly Purchase[], month: string): Won {
  return purchases
    .filter((purchase) => purchase.status === 'confirmed' && purchase.date.startsWith(`${month}-`))
    .reduce((sum, purchase) => sum + purchase.amount, 0);
}
