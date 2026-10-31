import {
  compareOffers,
  currentAndPrevious,
  purchaseBaseQty,
  toBase,
  unitPricePerBase,
  type Ingredient,
  type Purchase,
  type SupplierProduct,
} from "@marginlog/core";

export interface Latest {
  purchase: Purchase;
  unitPricePerBase: number;
}

export function latestOf(ingredient: Ingredient, purchases: readonly Purchase[]): Latest | null {
  const { current } = currentAndPrevious(ingredient, purchases);
  if (!current) return null;
  const price = unitPricePerBase(current, ingredient.baseUnit);
  return price === null ? null : { purchase: current, unitPricePerBase: price };
}

/**
 * Quantity to price offers for when the caller gives none: the base quantity of my latest purchase
 * (packSize x quantity), else one pack of the cheapest comparable product, else 1.
 */
export function defaultNeededBaseQty(
  ingredient: Ingredient,
  purchases: readonly Purchase[],
  products: readonly SupplierProduct[],
): number {
  const latest = latestOf(ingredient, purchases);
  const bought = latest ? purchaseBaseQty(latest.purchase, ingredient.baseUnit) : null;
  if (bought !== null && bought > 0) return bought;

  const cheapest = compareOffers(ingredient, products, 1).offers
    .filter((offer) => offer.comparable && offer.unitPricePerBase !== null)
    .sort((a, b) => (a.unitPricePerBase ?? 0) - (b.unitPricePerBase ?? 0))[0];
  const pack = cheapest ? toBase(cheapest.product.packSize, cheapest.product.packUnit, ingredient.baseUnit) : null;
  return pack !== null && pack > 0 ? pack : 1;
}
