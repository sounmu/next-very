import type {
  CostAlert, Ingredient, Menu, MenuCost, MenuCostLine, PriceChange, Purchase, Won,
} from './types';
import { baseOf, toBase, unitPricePerBase } from './units';

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export function priceHistory(ingredient: Ingredient, purchases: readonly Purchase[]): Purchase[] {
  return purchases
    .filter((p) => p.ingredientId === ingredient.id && p.status === 'confirmed'
      && baseOf(p.packUnit) === ingredient.baseUnit)
    .sort((a, b) => compare(a.date, b.date) || compare(a.id, b.id));
}

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

/** Only confirmed purchases of the ingredient's base dimension establish prices. */
export function computeMenuCost(
  menu: Menu,
  ingredients: readonly Ingredient[],
  purchases: readonly Purchase[],
): MenuCost {
  const lines = menu.recipe.map((line): MenuCostLine => {
    const ingredient = ingredients.find((item) => item.id === line.ingredientId);
    const baseQty = ingredient ? toBase(line.amount, line.unit, ingredient.baseUnit) : null;
    const { current, previous } = ingredient
      ? currentAndPrevious(ingredient, purchases)
      : { current: null, previous: null };
    const price = current && ingredient ? unitPricePerBase(current, ingredient.baseUnit) : null;
    const previousPrice = previous && ingredient ? unitPricePerBase(previous, ingredient.baseUnit) : null;
    return {
      ...line,
      baseQty,
      unitPricePerBase: price,
      priceDate: current?.date ?? null,
      supplierId: current?.supplierId ?? null,
      cost: baseQty === null || price === null ? null : Math.round(baseQty * price),
      previousCost: baseQty === null || previousPrice === null ? null : Math.round(baseQty * previousPrice),
      issue: ingredient && baseQty === null ? 'unit-mismatch' : price === null ? 'no-price' : null,
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
): MenuCost {
  const real = computeMenuCost(menu, ingredients, purchases);
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
    };
  });
  return { ...assemble(menu, lines), previousTotal: real.total };
}

export function priceChanges(
  ingredients: readonly Ingredient[],
  purchases: readonly Purchase[],
): PriceChange[] {
  return ingredients.flatMap((ingredient) => {
    const { current, previous } = currentAndPrevious(ingredient, purchases);
    if (current === null || previous === null) return [];
    const currentPrice = unitPricePerBase(current, ingredient.baseUnit);
    const previousPrice = unitPricePerBase(previous, ingredient.baseUnit);
    if (currentPrice === null || previousPrice === null) return [];
    return [{
      ingredientId: ingredient.id,
      previousUnitPrice: previousPrice,
      currentUnitPrice: currentPrice,
      changeRate: currentPrice / previousPrice - 1,
      currentDate: current.date,
      previousDate: previous.date,
    }];
  });
}

export function costAlert(
  menus: readonly Menu[],
  ingredients: readonly Ingredient[],
  purchases: readonly Purchase[],
): CostAlert | null {
  const increased = new Set(priceChanges(ingredients, purchases)
    .filter((change) => change.changeRate > 0).map((change) => change.ingredientId));
  let best: CostAlert | null = null;
  for (const menu of menus) {
    const { total, previousTotal } = computeMenuCost(menu, ingredients, purchases);
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
