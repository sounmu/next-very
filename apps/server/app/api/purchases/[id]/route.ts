import { PurchaseResponseSchema, PurchaseUpdateSchema } from "@marginlog/core/src/api/purchases";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db/client";
import { ingredients, purchases, suppliers } from "../../../../db/schema";
import { requireStore } from "../../../../lib/auth";
import { errorResponse, findOrCreateSupplier, handleError, HttpError, parseBody, toPurchase } from "../../invoices/shared";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// Another store's purchase answers the same 404 as an unknown id.
const inStore = (id: string, storeId: string) => and(eq(purchases.id, id), eq(purchases.storeId, storeId));

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const db = getDb();
  const auth = await requireStore(db, request);
  if (auth instanceof Response) return auth;
  const [row] = await db.select().from(purchases).where(inStore(id, auth.storeId));
  if (!row) return errorResponse(404, "구매 기록을 찾을 수 없어요");
  return Response.json(PurchaseResponseSchema.parse({ purchase: toPurchase(row) }));
}

// Unit prices are derived from the stored pack, quantity and amount, so nothing else is recomputed here.
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const db = getDb();
  const auth = await requireStore(db, request);
  if (auth instanceof Response) return auth;
  try {
    const body = await parseBody(request, PurchaseUpdateSchema);
    const row = await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(purchases).where(inStore(id, auth.storeId)).for("update");
      if (!existing) throw new HttpError(404, "구매 기록을 찾을 수 없어요");

      if (body.ingredientId) {
        const [found] = await tx
          .select({ id: ingredients.id })
          .from(ingredients)
          .where(and(eq(ingredients.id, body.ingredientId), eq(ingredients.storeId, auth.storeId)));
        if (!found) throw new HttpError(400, "등록되지 않은 재료예요");
      }
      let supplierId: string | undefined;
      if (body.supplierId) {
        const [found] = await tx
          .select({ id: suppliers.id })
          .from(suppliers)
          .where(and(eq(suppliers.id, body.supplierId), eq(suppliers.storeId, auth.storeId)));
        if (!found) throw new HttpError(400, "등록되지 않은 구매처예요");
        supplierId = found.id;
      } else if (body.supplierName) {
        supplierId = await findOrCreateSupplier(tx, auth.storeId, body.supplierName);
      }

      const [updated] = await tx
        .update(purchases)
        .set({
          ingredientId: body.ingredientId,
          supplierId,
          date: body.date,
          packSize: body.packSize,
          packUnit: body.packUnit,
          quantity: body.quantity,
          amount: body.amount,
        })
        .where(inStore(id, auth.storeId))
        .returning();
      return updated;
    });
    return Response.json(PurchaseResponseSchema.parse({ purchase: toPurchase(row) }));
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const db = getDb();
  const auth = await requireStore(db, request);
  if (auth instanceof Response) return auth;
  const [existing] = await db
    .select({ id: purchases.id, source: purchases.source })
    .from(purchases)
    .where(inStore(id, auth.storeId));
  if (!existing) return errorResponse(404, "구매 기록을 찾을 수 없어요");
  if (existing.source === "order") return errorResponse(409, "주문 입고로 만든 기록은 삭제할 수 없어요");
  await db.delete(purchases).where(inStore(id, auth.storeId));
  return Response.json({ id });
}
