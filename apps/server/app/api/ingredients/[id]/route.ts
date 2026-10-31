import { priceHistory } from "@marginlog/core";
import { IngredientDetailSchema, type LatestBySupplier } from "@marginlog/core/src/api/supplier";
import { getDb } from "../../../../db/client";
import { loadState } from "../../../../lib/repo";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await loadState(getDb());

  const ingredient = state.ingredients.find((i) => i.id === id);
  if (!ingredient) return Response.json({ error: "재료를 찾을 수 없어요" }, { status: 404 });

  const purchases = priceHistory(id, state.purchases);

  // purchases are date ascending, so the last one per supplier is its latest confirmed price.
  const latest = new Map<string, LatestBySupplier>();
  for (const p of purchases) {
    latest.set(p.supplierId, { supplierId: p.supplierId, unitPrice: p.unitPrice, date: p.date });
  }

  const menus = state.menus.filter((m) => m.recipe.some((l) => l.ingredientId === id));
  const usedIngredientIds = new Set(menus.flatMap((m) => m.recipe.map((l) => l.ingredientId)));

  const body = IngredientDetailSchema.parse({
    ingredient,
    purchases,
    suppliers: state.suppliers,
    latestBySupplier: [...latest.values()],
    quotes: state.quotes.filter((q) => q.ingredientId === id),
    menus,
    allPurchases: state.purchases.filter((p) => p.status === "confirmed" && usedIngredientIds.has(p.ingredientId)),
  });
  return Response.json(body);
}
