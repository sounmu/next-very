import { computeMenuCost, consumption, soldByMenu, type Menu } from "@marginlog/core";
import { MenuResponseSchema, MenusResponseSchema } from "@marginlog/core/src/api/menus";
import { getDb } from "../../../db/client";
import { menus, recipeLines } from "../../../db/schema";
import { loadState } from "../../../lib/repo";
import { readMenuUpsert } from "./shared";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await loadState(getDb());
  const used = consumption(state.menus, state.ingredients, state.sales);
  const sold = soldByMenu(state.sales);
  const body = MenusResponseSchema.parse({
    menus: state.menus.map((menu) => ({
      menu,
      cost: computeMenuCost(menu, state.ingredients, state.purchases, used),
      sold: sold.get(menu.id) ?? 0,
    })),
  });
  return Response.json(body);
}

export async function POST(request: Request) {
  const db = getDb();
  const read = await readMenuUpsert(request, db);
  if ("response" in read) return read.response;
  const { input } = read;

  const id = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(menus).values({ id, name: input.name, price: input.price, servingLabel: input.servingLabel });
    await tx.insert(recipeLines).values(
      input.recipe.map((line, position) => ({
        menuId: id,
        ingredientId: line.ingredientId,
        amount: line.amount,
        unit: line.unit,
        position,
      })),
    );
  });

  const menu: Menu = { id, name: input.name, price: input.price, servingLabel: input.servingLabel, recipe: input.recipe };
  return Response.json(MenuResponseSchema.parse({ menu }), { status: 201 });
}
