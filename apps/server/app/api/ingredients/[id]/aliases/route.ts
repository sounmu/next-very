import { AliasCreateSchema, IngredientResponseSchema } from "@marginlog/core/src/api/ingredients";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db/client";
import { ingredientAliases } from "../../../../../db/schema";
import { fail, loadIngredient, readBody } from "../../shared";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = await readBody(request, AliasCreateSchema);
  if ("response" in parsed) return parsed.response;
  const { alias } = parsed.data;

  const db = getDb();
  const ingredient = await loadIngredient(db, id);
  if (!ingredient) return fail("식재료를 찾을 수 없어요", 404);

  const inserted = await db
    .insert(ingredientAliases)
    .values({ alias, ingredientId: id })
    .onConflictDoNothing()
    .returning({ alias: ingredientAliases.alias });

  if (inserted.length === 0) {
    const [owner] = await db
      .select({ ingredientId: ingredientAliases.ingredientId })
      .from(ingredientAliases)
      .where(eq(ingredientAliases.alias, alias));
    if (owner?.ingredientId !== id) return fail("다른 식재료가 이미 쓰는 별칭이에요", 409);
    return Response.json(IngredientResponseSchema.parse({ ingredient }));
  }

  const body = IngredientResponseSchema.parse({
    ingredient: { ...ingredient, aliases: [...ingredient.aliases, alias] },
  });
  return Response.json(body, { status: 201 });
}
