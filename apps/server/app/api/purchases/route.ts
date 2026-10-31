import { unitPricePerBase } from "@marginlog/core";
import {
  PurchaseCreateSchema,
  PurchaseListQuerySchema,
  PurchaseResponseSchema,
  PurchasesResponseSchema,
} from "@marginlog/core/src/api/purchases";
import { getDb } from "../../../db/client";
import { purchases } from "../../../db/schema";
import { loadState } from "../../../lib/repo";
import { errorResponse, findOrCreateSupplier, handleError, HttpError, parseBody, toPurchase } from "../invoices/shared";

export const dynamic = "force-dynamic";

const desc = (a: string, b: string): number => (a < b ? 1 : a > b ? -1 : 0);

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const parsed = PurchaseListQuerySchema.safeParse({
    q: params.get("q") || undefined,
    ingredientId: params.get("ingredientId") || undefined,
    month: params.get("month") || undefined,
  });
  if (!parsed.success) return errorResponse(400, "검색 조건이 올바르지 않아요 (month는 YYYY-MM)");
  const { q, ingredientId, month } = parsed.data;

  const state = await loadState(getDb());
  const ingredientsById = new Map(state.ingredients.map((i) => [i.id, i]));
  const supplierNames = new Map(state.suppliers.map((s) => [s.id, s.name]));
  const needle = q?.toLowerCase();

  const list = state.purchases.flatMap((purchase) => {
    const ingredient = ingredientsById.get(purchase.ingredientId);
    const supplierName = supplierNames.get(purchase.supplierId);
    if (!ingredient || !supplierName) return [];
    if (ingredientId && purchase.ingredientId !== ingredientId) return [];
    if (month && !purchase.date.startsWith(`${month}-`)) return [];
    if (needle) {
      const haystack = [ingredient.name, supplierName, purchase.rawName ?? "", ...ingredient.aliases];
      if (!haystack.some((text) => text.toLowerCase().includes(needle))) return [];
    }
    return [
      {
        ...purchase,
        ingredientName: ingredient.name,
        supplierName,
        baseUnit: ingredient.baseUnit,
        unitPricePerBase: unitPricePerBase(purchase, ingredient.baseUnit),
      },
    ];
  });
  list.sort((a, b) => desc(a.date, b.date) || desc(a.id, b.id));

  return Response.json(PurchasesResponseSchema.parse({ purchases: list }));
}

export async function POST(request: Request) {
  try {
    const body = await parseBody(request, PurchaseCreateSchema);
    const db = getDb();
    const state = await loadState(db);
    if (!state.ingredients.some((i) => i.id === body.ingredientId)) throw new HttpError(400, "등록되지 않은 재료예요");
    if (body.supplierId && !state.suppliers.some((s) => s.id === body.supplierId)) {
      throw new HttpError(400, "등록되지 않은 구매처예요");
    }

    const row = await db.transaction(async (tx) => {
      const supplierId = body.supplierId ?? (await findOrCreateSupplier(tx, body.supplierName ?? ""));
      const [inserted] = await tx
        .insert(purchases)
        .values({
          id: `purchase-${crypto.randomUUID()}`,
          ingredientId: body.ingredientId,
          supplierId,
          date: body.date,
          packSize: body.packSize,
          packUnit: body.packUnit,
          quantity: body.quantity,
          amount: body.amount,
          status: "confirmed",
          source: "manual",
        })
        .returning();
      return inserted;
    });

    return Response.json(PurchaseResponseSchema.parse({ purchase: toPurchase(row) }), { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
