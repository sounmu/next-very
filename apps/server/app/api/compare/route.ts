import { compareOffers } from "@marginlog/core";
import { CompareResponseSchema } from "@marginlog/core/src/api/compare";
import { getDb } from "../../../db/client";
import { loadState } from "../../../lib/repo";
import { defaultNeededBaseQty, latestOf } from "./need";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await loadState(getDb());
  const supplierName = new Map(state.suppliers.map((s) => [s.id, s.name]));

  const items = state.ingredients.flatMap((ingredient) => {
    const products = state.products.filter((p) => p.ingredientId === ingredient.id);
    if (products.length === 0) return [];

    const needed = defaultNeededBaseQty(ingredient, state.purchases, products);
    const { offers, recommendedId } = compareOffers(ingredient, products, needed);
    const best = offers.find((offer) => offer.product.id === recommendedId);

    return [{
      ingredient,
      latestUnitPrice: latestOf(ingredient, state.purchases)?.unitPricePerBase ?? null,
      offerCount: offers.length,
      recommended: best
        ? {
            productId: best.product.id,
            supplierName: supplierName.get(best.product.supplierId) ?? best.product.supplierId,
            total: best.total,
          }
        : null,
    }];
  });

  return Response.json(CompareResponseSchema.parse({ items }));
}
