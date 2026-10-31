import { AliasCreateSchema, IngredientResponseSchema } from "@marginlog/core/src/api/ingredients";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db/client";
import { ingredientAliases, ingredients } from "../../../../../db/schema";
import { requireStore } from "../../../../../lib/auth";
import { fail, loadIngredient, readBody } from "../../shared";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const auth = await requireStore(db, request);
  if (auth instanceof Response) return auth;
  const parsed = await readBody(request, AliasCreateSchema);
  if ("response" in parsed) return parsed.response;
  const { alias } = parsed.data;

  const ingredient = await loadIngredient(db, auth.storeId, id);
  if (!ingredient) return fail("식재료를 찾을 수 없어요", 404);

  // The table's key is (ingredient, alias), so "one alias, one ingredient" is enforced per store here.
  const [owner] = await db
    .select({ ingredientId: ingredientAliases.ingredientId })
    .from(ingredientAliases)
    .innerJoin(ingredients, eq(ingredients.id, ingredientAliases.ingredientId))
    .where(and(eq(ingredients.storeId, auth.storeId), eq(ingredientAliases.alias, alias)));
  if (owner && owner.ingredientId !== id) return fail("다른 식재료가 이미 쓰는 별칭이에요", 409);
  if (owner) return Response.json(IngredientResponseSchema.parse({ ingredient }));

  await db.insert(ingredientAliases).values({ alias, ingredientId: id }).onConflictDoNothing();

  const body = IngredientResponseSchema.parse({
    ingredient: { ...ingredient, aliases: [...ingredient.aliases, alias] },
  });
  return Response.json(body, { status: 201 });
}
