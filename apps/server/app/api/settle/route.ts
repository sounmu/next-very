import { computeMenuCost, consumption, nextSettleDate, settleDay } from "@marginlog/core";
import { SettleResponseSchema } from "@marginlog/core/src/api/settle";
import { getDb } from "../../../db/client";
import { sales } from "../../../db/schema";
import { requireStore } from "../../../lib/auth";
import { loadState } from "../../../lib/repo";
import { errorResponse } from "../invoices/shared";

export const dynamic = "force-dynamic";

/** Today in Asia/Seoul as YYYY-MM-DD ("en-CA" formats dates that way). */
const todaySeoul = (): string => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());

/** Demo 정산하기: records one day of random sales within stock, then reports the menu costs that moved. */
export async function POST(request: Request) {
  const db = getDb();
  const auth = await requireStore(db, request);
  if (auth instanceof Response) return auth;
  const state = await loadState(db, auth.storeId);
  const date = nextSettleDate(state.sales, todaySeoul());
  const lines = settleDay(state.menus, state.ingredients, state.purchases, state.sales, date);
  const rows = lines
    .filter((line) => line.quantity > 0)
    .map((line) => ({
      id: `sale-${auth.storeId}-${date}-${line.menuId}`,
      storeId: auth.storeId,
      menuId: line.menuId,
      date,
      quantity: line.quantity,
    }));

  if (rows.length > 0) {
    // A double tap computes the same day and ids; the second insert adds nothing.
    const inserted = await db.insert(sales).values(rows).onConflictDoNothing().returning({ id: sales.id });
    if (inserted.length === 0) return errorResponse(409, "이미 정산한 날이에요");
  }

  const afterSales = [...state.sales, ...rows];
  const usedBefore = consumption(state.menus, state.ingredients, state.sales);
  const usedAfter = consumption(state.menus, state.ingredients, afterSales);
  const changes = state.menus.flatMap((menu) => {
    const before = computeMenuCost(menu, state.ingredients, state.purchases, usedBefore);
    const after = computeMenuCost(menu, state.ingredients, state.purchases, usedAfter);
    return before.total === after.total ? [] : [{ menuId: menu.id, menuName: menu.name, before, after }];
  });
  const names = new Map(state.menus.map((menu) => [menu.id, menu.name]));

  return Response.json(
    SettleResponseSchema.parse({
      date,
      nextDate: nextSettleDate(afterSales, date),
      lines: lines.map((line) => ({ ...line, menuName: names.get(line.menuId) ?? line.menuId })),
      changes,
    }),
  );
}
