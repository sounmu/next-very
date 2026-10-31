import { MenuUpsertSchema, type MenuUpsert } from "@marginlog/core/src/api/menus";
import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "../../../db/client";
import { ingredients } from "../../../db/schema";

export const errorResponse = (status: number, error: string): Response => Response.json({ error }, { status });

export const menuNotFound = (): Response => errorResponse(404, "메뉴를 찾을 수 없어요");

export async function readMenuUpsert(
  request: Request,
  db: Db,
  storeId: string,
): Promise<{ input: MenuUpsert } | { response: Response }> {
  const json: unknown = await request.json().catch(() => undefined);
  if (json === undefined) return { response: errorResponse(400, "요청 본문이 올바른 JSON이 아니에요") };

  const parsed = MenuUpsertSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue && issue.path.length > 0 ? ` (${issue.path.join(".")})` : "";
    return { response: errorResponse(400, `메뉴 입력값이 올바르지 않아요${where}`) };
  }
  const input = parsed.data;

  const ids = input.recipe.map((line) => line.ingredientId);
  const known = await db.select({ id: ingredients.id }).from(ingredients).where(and(eq(ingredients.storeId, storeId), inArray(ingredients.id, ids)));
  const knownIds = new Set(known.map((row) => row.id));
  const unknown = ids.filter((id) => !knownIds.has(id));
  if (unknown.length > 0) return { response: errorResponse(400, `알 수 없는 재료예요: ${unknown.join(", ")}`) };

  return { input };
}
