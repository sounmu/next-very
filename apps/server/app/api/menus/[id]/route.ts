import { computeMenuCost, type Menu } from "@marginlog/core";
import { MenuDetailResponseSchema, MenuResponseSchema } from "@marginlog/core/src/api/menus";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../db/client";
import { menus, recipeLines } from "../../../../db/schema";
import { loadState } from "../../../../lib/repo";
import { menuNotFound, readMenuUpsert } from "../shared";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const state = await loadState(getDb());

  const menu = state.menus.find((m) => m.id === id);
  if (!menu) return menuNotFound();

  const cost = computeMenuCost(menu, state.ingredients, state.purchases);
  const recipeIds = new Set(menu.recipe.map((line) => line.ingredientId));
  const supplierIds = new Set(cost.lines.flatMap((line) => (line.supplierId === null ? [] : [line.supplierId])));

  const body = MenuDetailResponseSchema.parse({
    menu,
    cost,
    ingredients: state.ingredients.filter((ingredient) => recipeIds.has(ingredient.id)),
    suppliers: state.suppliers.filter((supplier) => supplierIds.has(supplier.id)),
  });
  return Response.json(body);
}

export async function PUT(request: Request, { params }: Context) {
  const { id } = await params;
  const db = getDb();

  const read = await readMenuUpsert(request, db);
  if ("response" in read) return read.response;
  const { input } = read;

  const saved = await db.transaction(async (tx) => {
    const updated = await tx
      .update(menus)
      .set({ name: input.name, price: input.price, servingLabel: input.servingLabel })
      .where(eq(menus.id, id))
      .returning({ id: menus.id });
    if (updated.length === 0) return false;

    await tx.delete(recipeLines).where(eq(recipeLines.menuId, id));
    await tx.insert(recipeLines).values(
      input.recipe.map((line, position) => ({
        menuId: id,
        ingredientId: line.ingredientId,
        amount: line.amount,
        unit: line.unit,
        position,
      })),
    );
    return true;
  });
  if (!saved) return menuNotFound();

  const menu: Menu = { id, name: input.name, price: input.price, servingLabel: input.servingLabel, recipe: input.recipe };
  return Response.json(MenuResponseSchema.parse({ menu }));
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id } = await params;
  const deleted = await getDb().delete(menus).where(eq(menus.id, id)).returning({ id: menus.id });
  if (deleted.length === 0) return menuNotFound();
  return new Response(null, { status: 204 });
}
