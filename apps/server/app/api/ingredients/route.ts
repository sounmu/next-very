import { IngredientsResponseSchema } from "@marginlog/core/src/api/menu";
import { getDb } from "../../../db/client";
import { loadState } from "../../../lib/repo";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await loadState(getDb());
  const priced = new Set(state.purchases.filter((p) => p.status === "confirmed").map((p) => p.ingredientId));

  const body = IngredientsResponseSchema.parse({
    ingredients: state.ingredients,
    pricedIds: state.ingredients.filter((i) => priced.has(i.id)).map((i) => i.id),
  });
  return Response.json(body);
}
