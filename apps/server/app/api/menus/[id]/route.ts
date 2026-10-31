import { computeMenuCost, consumption, soldByMenu, stockOf, type Menu } from "@marginlog/core";
import { MenuDetailResponseSchema, MenuResponseSchema } from "@marginlog/core/src/api/menus";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db/client";
import { menus, recipeLines } from "../../../../db/schema";
import { requireStore } from "../../../../lib/auth";
import { loadState } from "../../../../lib/repo";
import { menuNotFound, readMenuUpsert } from "../shared";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const { id } = await params;
  const db = getDb();
  const auth = await requireStore(db, request);
  if (auth instanceof Response) return auth;
  const state = await loadState(db, auth.storeId);

  const menu = state.menus.find((m) => m.id === id);
  if (!menu) return menuNotFound();

  const used = consumption(state.menus, state.ingredients, state.sales);
  const cost = computeMenuCost(menu, state.ingredients, state.purchases, used);
  const recipeIds = new Set(menu.recipe.map((line) => line.ingredientId));
  const stock = state.ingredients
    .filter((ingredient) => recipeIds.has(ingredient.id))
    .map((ingredient) => {
      const { remaining, current, next } = stockOf(ingredient, state.purchases, used.get(ingredient.id) ?? 0);
      return {
        ingredientId: ingredient.id,
        remaining,
        current: current && { date: current.date, unitPricePerBase: current.unitPricePerBase, remaining: current.remaining },
        next: next && { date: next.date, unitPricePerBase: next.unitPricePerBase },
      };
    });
  const supplierIds = new Set(cost.lines.flatMap((line) => (line.supplierId === null ? [] : [line.supplierId])));

  const body = MenuDetailResponseSchema.parse({
    menu,
    cost,
    sold: soldByMenu(state.sales).get(menu.id) ?? 0,
    stock,
    ingredients: state.ingredients.filter((ingredient) => recipeIds.has(ingredient.id)),
    suppliers: state.suppliers.filter((supplier) => supplierIds.has(supplier.id)),
  });
  return Response.json(body);
}

export async function PUT(request: Request, { params }: Context) {
  const { id } = await params;
  const db = getDb();
  const auth = await requireStore(db, request);
  if (auth instanceof Response) return auth;

  const read = await readMenuUpsert(request, db, auth.storeId);
  if ("response" in read) return read.response;
  const { input } = read;

  const saved = await db.transaction(async (tx) => {
    const updated = await tx
      .update(menus)
      .set({ name: input.name, price: input.price, servingLabel: input.servingLabel })
      .where(and(eq(menus.id, id), eq(menus.storeId, auth.storeId)))
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

export async function DELETE(request: Request, { params }: Context) {
  const { id } = await params;
  const db = getDb();
  const auth = await requireStore(db, request);
  if (auth instanceof Response) return auth;
  const deleted = await db
    .delete(menus)
    .where(and(eq(menus.id, id), eq(menus.storeId, auth.storeId)))
    .returning({ id: menus.id });
  if (deleted.length === 0) return menuNotFound();
  return new Response(null, { status: 204 });
}
