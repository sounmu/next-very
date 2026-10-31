import { baseOf, consumption, stockOf, unitPricePerBase } from "@marginlog/core";
import {
  IngredientDetailResponseSchema,
  IngredientResponseSchema,
  IngredientUpdateSchema,
} from "@marginlog/core/src/api/ingredients";
import { and, eq, ne } from "drizzle-orm";
import { getDb } from "../../../../db/client";
import { ingredients, purchases, recipeLines } from "../../../../db/schema";
import { requireStore } from "../../../../lib/auth";
import { loadMarketIndex, loadState } from "../../../../lib/repo";
import { fail, loadIngredient, readBody } from "../shared";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export async function GET(request: Request, { params }: Context) {
  const { id } = await params;
  const db = getDb();
  const auth = await requireStore(db, request);
  if (auth instanceof Response) return auth;
  const state = await loadState(db, auth.storeId);
  const ingredient = state.ingredients.find((i) => i.id === id);
  if (!ingredient) return fail("식재료를 찾을 수 없어요", 404);

  const supplierNames = new Map(state.suppliers.map((s) => [s.id, s.name]));
  const history = state.purchases
    .filter((p) => p.ingredientId === id)
    .sort((a, b) => compare(b.date, a.date) || compare(b.id, a.id))
    .map((p) => ({
      ...p,
      unitPricePerBase: unitPricePerBase(p, ingredient.baseUnit),
      supplierName: supplierNames.get(p.supplierId) ?? p.supplierId,
    }));
  const menus = state.menus.filter((m) => m.recipe.some((line) => line.ingredientId === id));
  const marketIndex = await loadMarketIndex(db, auth.storeId, id);
  const used = consumption(state.menus, state.ingredients, state.sales).get(id) ?? 0;
  const { remaining, lots } = stockOf(ingredient, state.purchases, used);
  const stock = { remaining, lots };

  return Response.json(IngredientDetailResponseSchema.parse({ ingredient, history, stock, menus, marketIndex }));
}

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  const db = getDb();
  const auth = await requireStore(db, request);
  if (auth instanceof Response) return auth;
  const parsed = await readBody(request, IngredientUpdateSchema);
  if ("response" in parsed) return parsed.response;
  const { name, spec, baseUnit } = parsed.data;

  const current = await loadIngredient(db, auth.storeId, id);
  if (!current) return fail("식재료를 찾을 수 없어요", 404);

  if (name !== undefined && name !== current.name) {
    const clash = await db
      .select({ id: ingredients.id })
      .from(ingredients)
      .where(and(eq(ingredients.storeId, auth.storeId), eq(ingredients.name, name), ne(ingredients.id, id)));
    if (clash.length > 0) return fail("이미 있는 식재료 이름이에요", 409);
  }

  if (baseUnit !== undefined && baseUnit !== current.baseUnit) {
    const purchaseUnits = await db.select({ unit: purchases.packUnit }).from(purchases).where(eq(purchases.ingredientId, id));
    const recipeUnits = await db.select({ unit: recipeLines.unit }).from(recipeLines).where(eq(recipeLines.ingredientId, id));
    if ([...purchaseUnits, ...recipeUnits].some((row) => baseOf(row.unit) !== baseUnit)) {
      return fail("구매 기록이나 레시피에 다른 단위가 있어 기본 단위를 바꿀 수 없어요", 409);
    }
  }

  const changes = {
    ...(name !== undefined && { name }),
    ...(spec !== undefined && { spec }),
    ...(baseUnit !== undefined && { baseUnit }),
  };
  if (Object.keys(changes).length > 0) {
    await db
      .update(ingredients)
      .set(changes)
      .where(and(eq(ingredients.id, id), eq(ingredients.storeId, auth.storeId)));
  }

  const updated = await loadIngredient(db, auth.storeId, id);
  if (!updated) return fail("식재료를 찾을 수 없어요", 404);
  return Response.json(IngredientResponseSchema.parse({ ingredient: updated }));
}
