import type { Ingredient } from "@marginlog/core";
import { ErrorResponseSchema } from "@marginlog/core/src/api/common";
import { and, asc, eq } from "drizzle-orm";
import type { z } from "zod";
import type { Db } from "../../../db/client";
import { ingredientAliases, ingredients } from "../../../db/schema";

export function fail(message: string, status: number): Response {
  return Response.json(ErrorResponseSchema.parse({ error: message }), { status });
}

export async function readBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<{ data: z.infer<S> } | { response: Response }> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return { response: fail("요청 내용을 읽을 수 없어요", 400) };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path.join(".");
    return { response: fail(field ? `입력값이 올바르지 않아요 (${field})` : "입력값이 올바르지 않아요", 400) };
  }
  return { data: parsed.data };
}

/** null when the ingredient does not exist in this store. */
export async function loadIngredient(db: Db, storeId: string, id: string): Promise<Ingredient | null> {
  const [row] = await db
    .select()
    .from(ingredients)
    .where(and(eq(ingredients.id, id), eq(ingredients.storeId, storeId)));
  if (!row) return null;
  const aliasRows = await db
    .select()
    .from(ingredientAliases)
    .where(eq(ingredientAliases.ingredientId, id))
    .orderBy(asc(ingredientAliases.alias));
  return {
    id: row.id,
    name: row.name,
    spec: row.spec ?? undefined,
    baseUnit: row.baseUnit,
    marketCode: row.marketCode ?? undefined,
    aliases: aliasRows.map((a) => a.alias),
  };
}
