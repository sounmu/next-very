import type {
  CostAlert,
  Grams,
  Menu,
  MenuCost,
  MenuCostLine,
  Purchase,
  Won,
  WonPerKg,
} from './types';

/** Price per kg of a pack: round(amount / (quantity * packWeightG / 1000)). */
export function unitPriceFromPack(amount: Won, quantity: number, packWeightG: Grams): WonPerKg {
  return Math.round(amount / ((quantity * packWeightG) / 1000));
}

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export function priceHistory(ingredientId: string, purchases: readonly Purchase[]): Purchase[] {
  return purchases
    .filter((p) => p.ingredientId === ingredientId && p.status === 'confirmed')
    .sort((a, b) => compare(a.date, b.date) || compare(a.id, b.id));
}

export function currentAndPrevious(
  ingredientId: string,
  purchases: readonly Purchase[],
): { current: Purchase | null; previous: Purchase | null } {
  const history = priceHistory(ingredientId, purchases);
  return {
    current: history.at(-1) ?? null,
    previous: history.at(-2) ?? null,
  };
}

export function ratioPercent(total: Won, price: Won): number {
  return Math.round((total / price) * 100);
}

const portionCost = (grams: Grams, unitPrice: WonPerKg): Won => Math.round((grams * unitPrice) / 1000);

interface PriceInfo {
  unitPrice: WonPerKg | null;
  supplierId: string | null;
  previousUnitPrice: WonPerKg | null;
}

function assemble(menu: Menu, priceOf: (ingredientId: string) => PriceInfo): MenuCost {
  const lines: MenuCostLine[] = menu.recipe.map(({ ingredientId, grams }) => {
    const p = priceOf(ingredientId);
    return {
      ingredientId,
      grams,
      unitPrice: p.unitPrice,
      supplierId: p.supplierId,
      cost: p.unitPrice === null ? null : portionCost(grams, p.unitPrice),
      previousCost: p.previousUnitPrice === null ? null : portionCost(grams, p.previousUnitPrice),
    };
  });

  const missing = lines.filter((l) => l.cost === null).map((l) => l.ingredientId);
  const total = missing.length > 0 ? null : lines.reduce((sum, l) => sum + (l.cost ?? 0), 0);
  const previousTotal =
    total === null || !lines.some((l) => l.previousCost !== null)
      ? null
      : lines.reduce((sum, l) => sum + (l.previousCost ?? l.cost ?? 0), 0);

  return {
    menuId: menu.id,
    total,
    ratio: total === null ? null : total / menu.price,
    previousTotal,
    lines,
    missing,
  };
}

/** Menu cost from confirmed purchases only. Quotes are never an input. */
export function computeMenuCost(menu: Menu, purchases: readonly Purchase[]): MenuCost {
  return assemble(menu, (ingredientId) => {
    const { current, previous } = currentAndPrevious(ingredientId, purchases);
    return {
      unitPrice: current?.unitPrice ?? null,
      supplierId: current?.supplierId ?? null,
      previousUnitPrice: previous?.unitPrice ?? null,
    };
  });
}

/**
 * Menu cost as if the ingredient's current price were `unitPrice`. The
 * previous totals and per-line previous costs are the real current ones.
 * Writes nothing.
 */
export function previewWithPrice(
  menu: Menu,
  purchases: readonly Purchase[],
  ingredientId: string,
  unitPrice: WonPerKg,
): MenuCost {
  const real = computeMenuCost(menu, purchases);
  const realLines = new Map(real.lines.map((l) => [l.ingredientId, l]));
  const preview = assemble(menu, (id) => {
    const line = realLines.get(id);
    return {
      unitPrice: id === ingredientId ? unitPrice : (line?.unitPrice ?? null),
      supplierId: id === ingredientId ? null : (line?.supplierId ?? null),
      previousUnitPrice: line?.unitPrice ?? null,
    };
  });
  return { ...preview, previousTotal: real.total };
}

export function costAlert(menus: readonly Menu[], purchases: readonly Purchase[]): CostAlert | null {
  let best: CostAlert | null = null;
  for (const menu of menus) {
    const { total, previousTotal } = computeMenuCost(menu, purchases);
    if (total === null || previousTotal === null) continue;
    const delta = total - previousTotal;
    if (delta <= 0 || (best !== null && delta <= best.delta)) continue;
    const ingredientIds = menu.recipe
      .map((line) => line.ingredientId)
      .filter((id) => {
        const { current, previous } = currentAndPrevious(id, purchases);
        return current !== null && previous !== null && current.unitPrice > previous.unitPrice;
      });
    best = { menuId: menu.id, menuName: menu.name, delta, ingredientIds };
  }
  return best;
}
