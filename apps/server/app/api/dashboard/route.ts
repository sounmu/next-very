import { computeMenuCost, consumption, costAlert, monthSpend, nextSettleDate, priceChanges, soldByMenu } from "@marginlog/core";
import { DashboardResponseSchema } from "@marginlog/core/src/api/dashboard";
import { getDb } from "../../../db/client";
import { requireStore } from "../../../lib/auth";
import { loadInvoices, loadState } from "../../../lib/repo";

export const dynamic = "force-dynamic";

function seoulMonth(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}`;
}

/** Today in Asia/Seoul as YYYY-MM-DD ("en-CA" formats dates that way). */
const todaySeoul = (): string => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());

export async function GET(request: Request) {
  const db = getDb();
  const auth = await requireStore(db, request);
  if (auth instanceof Response) return auth;
  const [state, invoices] = await Promise.all([loadState(db, auth.storeId), loadInvoices(db, auth.storeId)]);
  const used = consumption(state.menus, state.ingredients, state.sales);
  const sold = soldByMenu(state.sales);

  const months = new Set(state.purchases.filter((p) => p.status === "confirmed").map((p) => p.date.slice(0, 7)));
  const currentMonth = seoulMonth(new Date());
  const latestMonth = [...months].sort().at(-1);
  const month = months.has(currentMonth) || latestMonth === undefined ? currentMonth : latestMonth;

  const names = new Map(state.ingredients.map((i) => [i.id, i]));
  const changes = priceChanges(state.ingredients, state.purchases, used)
    .sort((a, b) => Math.abs(b.changeRate) - Math.abs(a.changeRate) || (a.ingredientId < b.ingredientId ? -1 : 1))
    .slice(0, 5)
    .flatMap((change) => {
      const ingredient = names.get(change.ingredientId);
      if (!ingredient) return [];
      return [{
        ingredientId: change.ingredientId,
        name: ingredient.name,
        baseUnit: ingredient.baseUnit,
        previousUnitPrice: change.previousUnitPrice,
        currentUnitPrice: change.currentUnitPrice,
        changeRate: change.changeRate,
        currentDate: change.currentDate,
      }];
    });

  const supplierNames = new Map(state.suppliers.map((s) => [s.id, s.name]));
  const needsReview = invoices
    .filter((invoice) => invoice.status === "extracted")
    .map((invoice) => ({
      invoiceId: invoice.id,
      supplier: invoice.extraction.supplier || (invoice.supplierId ? supplierNames.get(invoice.supplierId) ?? "" : ""),
      date: invoice.date ?? (invoice.extraction.date || null),
      itemCount: invoice.extraction.items.length,
      issueCount: invoice.extraction.items.filter((item) => item.confidence === "low").length,
      isDemo: invoice.isDemo,
    }));

  const body = DashboardResponseSchema.parse({
    month,
    monthIsCurrent: month === currentMonth,
    monthSpend: monthSpend(state.purchases, month),
    purchaseCount: state.purchases.filter((p) => p.status === "confirmed" && p.date.startsWith(`${month}-`)).length,
    nextSettleDate: nextSettleDate(state.sales, todaySeoul()),
    menus: state.menus.map((menu) => ({
      menu,
      cost: computeMenuCost(menu, state.ingredients, state.purchases, used),
      sold: sold.get(menu.id) ?? 0,
    })),
    priceChanges: changes,
    needsReview,
    alert: costAlert(state.menus, state.ingredients, state.purchases, used),
  });
  return Response.json(body);
}
