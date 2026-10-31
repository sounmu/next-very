import { computeMenuCost, MenuUpsertSchema, type Menu } from "@marginlog/core";
import { MenuDetailSchema, MenuSaveResponseSchema } from "@marginlog/core/src/api/menu";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../db/client";
import { ingredients, menus, recipeLines } from "../../../../db/schema";
import { loadState } from "../../../../lib/repo";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

const notFound = () => Response.json({ error: "메뉴를 찾을 수 없어요" }, { status: 404 });
const badRequest = (error: string) => Response.json({ error }, { status: 400 });

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const state = await loadState(getDb());

  const menu = state.menus.find((m) => m.id === id);
  if (!menu) return notFound();

  const cost = computeMenuCost(menu, state.purchases);
  const recipeIds = new Set(menu.recipe.map((l) => l.ingredientId));
  const supplierIds = new Set(cost.lines.flatMap((l) => (l.supplierId === null ? [] : [l.supplierId])));

  const body = MenuDetailSchema.parse({
    menu,
    cost,
    ingredients: state.ingredients.filter((i) => recipeIds.has(i.id)),
    suppliers: state.suppliers.filter((s) => supplierIds.has(s.id)),
  });
  return Response.json(body);
}

export async function PUT(request: Request, { params }: Context) {
  const { id: paramId } = await params;

  const json: unknown = await request.json().catch(() => undefined);
  if (json === undefined) return badRequest("요청 본문이 올바른 JSON이 아니에요");
  const parsed = MenuUpsertSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return badRequest(issue ? `${issue.path.join(".") || "body"}: ${issue.message}` : "요청 형식이 올바르지 않아요");
  }
  const input = parsed.data;

  const db = getDb();
  const ingredientIds = input.recipe.map((l) => l.ingredientId);
  const known = await db.select({ id: ingredients.id }).from(ingredients).where(inArray(ingredients.id, ingredientIds));
  const knownIds = new Set(known.map((r) => r.id));
  const unknown = ingredientIds.filter((ingredientId) => !knownIds.has(ingredientId));
  if (unknown.length > 0) return badRequest(`알 수 없는 재료예요: ${unknown.join(", ")}`);

  const isNew = paramId === "new";
  const id = isNew ? crypto.randomUUID() : paramId;

  const saved = await db.transaction(async (tx) => {
    if (isNew) {
      await tx.insert(menus).values({ id, name: input.name, price: input.price, servings: 1 });
    } else {
      const updated = await tx
        .update(menus)
        .set({ name: input.name, price: input.price, servings: 1 })
        .where(eq(menus.id, id))
        .returning({ id: menus.id });
      if (updated.length === 0) return false;
      await tx.delete(recipeLines).where(eq(recipeLines.menuId, id));
    }
    await tx
      .insert(recipeLines)
      .values(input.recipe.map((line, position) => ({ menuId: id, ingredientId: line.ingredientId, grams: line.grams, position })));
    return true;
  });
  if (!saved) return notFound();

  const menu: Menu = { id, name: input.name, price: input.price, servings: 1, recipe: input.recipe };
  return Response.json(MenuSaveResponseSchema.parse({ menu }));
}
