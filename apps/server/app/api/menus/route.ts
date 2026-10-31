import { computeMenuCost, costAlert, MenusResponseSchema, type Menu, type Purchase, type Quote } from "@marginlog/core";
import { getDb } from "../../../db/client";
import { loadState } from "../../../lib/repo";

export const dynamic = "force-dynamic";

/** A quote is pending until that supplier has a confirmed purchase of that ingredient dated on or after it. */
function hasPendingQuote(menu: Menu, quotes: readonly Quote[], purchases: readonly Purchase[]): boolean {
  const ids = new Set(menu.recipe.map((l) => l.ingredientId));
  return quotes.some(
    (q) =>
      ids.has(q.ingredientId) &&
      !purchases.some(
        (p) =>
          p.status === "confirmed" &&
          p.supplierId === q.supplierId &&
          p.ingredientId === q.ingredientId &&
          p.date >= q.date,
      ),
  );
}

export async function GET() {
  const state = await loadState(getDb());
  const body = MenusResponseSchema.parse({
    menus: state.menus.map((menu) => ({
      menu,
      cost: computeMenuCost(menu, state.purchases),
      hasPendingQuote: hasPendingQuote(menu, state.quotes, state.purchases),
    })),
    alert: costAlert(state.menus, state.purchases),
  });
  return Response.json(body);
}
