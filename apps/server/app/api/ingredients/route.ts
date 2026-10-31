import { currentAndPrevious, unitPricePerBase } from "@marginlog/core";
import {
  IngredientCreateSchema,
  IngredientResponseSchema,
  IngredientsResponseSchema,
} from "@marginlog/core/src/api/ingredients";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "../../../db/client";
import { ingredients } from "../../../db/schema";
import { loadState } from "../../../lib/repo";
import { fail, readBody } from "./shared";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await loadState(getDb());
  const list = state.ingredients
    .map((ingredient) => {
      const { current } = currentAndPrevious(ingredient, state.purchases);
      const price = current ? unitPricePerBase(current, ingredient.baseUnit) : null;
      return {
        ...ingredient,
        latest:
          current && price !== null
            ? { unitPricePerBase: price, date: current.date, supplierId: current.supplierId }
            : null,
        purchaseCount: state.purchases.filter((p) => p.ingredientId === ingredient.id).length,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  return Response.json(IngredientsResponseSchema.parse({ ingredients: list }));
}

export async function POST(request: Request) {
  const parsed = await readBody(request, IngredientCreateSchema);
  if ("response" in parsed) return parsed.response;
  const { name, baseUnit, spec } = parsed.data;

  const db = getDb();
  const existing = await db.select({ id: ingredients.id }).from(ingredients).where(eq(ingredients.name, name));
  if (existing.length > 0) return fail("이미 있는 식재료예요", 409);

  const id = `ingredient-${randomUUID()}`;
  await db.insert(ingredients).values({ id, name, baseUnit, spec: spec ?? null });
  const body = IngredientResponseSchema.parse({ ingredient: { id, name, baseUnit, spec, aliases: [] } });
  return Response.json(body, { status: 201 });
}
