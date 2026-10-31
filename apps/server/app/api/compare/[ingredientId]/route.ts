import { compareOffers } from "@marginlog/core";
import { CompareDetailQuerySchema, CompareDetailResponseSchema } from "@marginlog/core/src/api/compare";
import { getDb } from "../../../../db/client";
import { requireStore } from "../../../../lib/auth";
import { loadState } from "../../../../lib/repo";
import { defaultNeededBaseQty, latestOf } from "../need";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ ingredientId: string }> }) {
  const { ingredientId } = await params;
  const db = getDb();
  const auth = await requireStore(db, request);
  if (auth instanceof Response) return auth;

  const rawNeed = new URL(request.url).searchParams.get("need");
  const query = CompareDetailQuerySchema.safeParse({ need: rawNeed ?? undefined });
  if (!query.success) {
    return Response.json({ error: "필요 수량은 0보다 큰 숫자여야 해요" }, { status: 400 });
  }

  const state = await loadState(db, auth.storeId);
  const ingredient = state.ingredients.find((i) => i.id === ingredientId);
  if (!ingredient) return Response.json({ error: "재료를 찾을 수 없어요" }, { status: 404 });

  const supplierName = new Map(state.suppliers.map((s) => [s.id, s.name]));
  const nameOf = (supplierId: string) => supplierName.get(supplierId) ?? supplierId;

  const products = state.products.filter((p) => p.ingredientId === ingredient.id);
  const neededBaseQty = query.data.need ?? defaultNeededBaseQty(ingredient, state.purchases, products);
  const { offers, recommendedId } = compareOffers(ingredient, products, neededBaseQty);
  const latest = latestOf(ingredient, state.purchases);

  const body = CompareDetailResponseSchema.parse({
    ingredient,
    neededBaseQty,
    myLatest: latest
      ? {
          unitPricePerBase: latest.unitPricePerBase,
          date: latest.purchase.date,
          supplierName: nameOf(latest.purchase.supplierId),
        }
      : null,
    offers: offers.map((offer) => ({ ...offer, supplierName: nameOf(offer.product.supplierId) })),
    recommendedId,
    isDemo: true,
  });
  return Response.json(body);
}
