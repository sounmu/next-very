import type { Ingredient, Offer, SupplierProduct } from './types';
import { toBase } from './units';

export function compareOffers(
  ingredient: Ingredient,
  products: readonly SupplierProduct[],
  neededBaseQty: number,
): { offers: Offer[]; recommendedId: string | null } {
  const offers = products.filter((product) => product.ingredientId === ingredient.id)
    .map((product): Offer => {
      const packBaseQty = toBase(product.packSize, product.packUnit, ingredient.baseUnit);
      const reason = packBaseQty === null ? 'unit'
        : ingredient.spec !== undefined && product.spec !== ingredient.spec ? 'spec' : null;
      // An incompatible dimension cannot supply any computable base quantity.
      const packs = packBaseQty === null ? 1 : Math.max(1, Math.ceil(neededBaseQty / packBaseQty));
      const itemsTotal = packs * product.price;
      return {
        product,
        comparable: reason === null,
        reason,
        unitPricePerBase: packBaseQty === null ? null : product.price / packBaseQty,
        packs,
        itemsTotal,
        shippingFee: product.shippingFee,
        total: itemsTotal + product.shippingFee,
        meetsMinOrder: itemsTotal >= product.minOrderAmount,
      };
    })
    .sort((a, b) => Number(b.comparable) - Number(a.comparable) || a.total - b.total);
  const eligible = offers.filter((offer) => offer.comparable && offer.meetsMinOrder)
    .sort((a, b) => a.total - b.total
      || (a.unitPricePerBase ?? 0) - (b.unitPricePerBase ?? 0)
      || (a.product.id < b.product.id ? -1 : a.product.id > b.product.id ? 1 : 0));
  return { offers, recommendedId: eligible[0]?.product.id ?? null };
}
