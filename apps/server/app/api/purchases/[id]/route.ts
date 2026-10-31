import { PurchaseResponseSchema, PurchaseUpdateSchema } from "@marginlog/core/src/api/purchases";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../db/client";
import { ingredients, purchases, suppliers } from "../../../../db/schema";
import { errorResponse, findOrCreateSupplier, handleError, HttpError, parseBody, toPurchase } from "../../invoices/shared";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const [row] = await getDb().select().from(purchases).where(eq(purchases.id, id));
  if (!row) return errorResponse(404, "구매 기록을 찾을 수 없어요");
  return Response.json(PurchaseResponseSchema.parse({ purchase: toPurchase(row) }));
}

// Unit prices are derived from the stored pack, quantity and amount, so nothing else is recomputed here.
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const body = await parseBody(request, PurchaseUpdateSchema);
    const db = getDb();
    const row = await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(purchases).where(eq(purchases.id, id)).for("update");
      if (!existing) throw new HttpError(404, "구매 기록을 찾을 수 없어요");

      if (body.ingredientId) {
        const [found] = await tx.select({ id: ingredients.id }).from(ingredients).where(eq(ingredients.id, body.ingredientId));
        if (!found) throw new HttpError(400, "등록되지 않은 재료예요");
      }
      let supplierId: string | undefined;
      if (body.supplierId) {
        const [found] = await tx.select({ id: suppliers.id }).from(suppliers).where(eq(suppliers.id, body.supplierId));
        if (!found) throw new HttpError(400, "등록되지 않은 구매처예요");
        supplierId = found.id;
      } else if (body.supplierName) {
        supplierId = await findOrCreateSupplier(tx, body.supplierName);
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
        .where(eq(purchases.id, id))
        .returning();
      return updated;
    });
    return Response.json(PurchaseResponseSchema.parse({ purchase: toPurchase(row) }));
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const db = getDb();
  const [existing] = await db.select({ id: purchases.id, source: purchases.source }).from(purchases).where(eq(purchases.id, id));
  if (!existing) return errorResponse(404, "구매 기록을 찾을 수 없어요");
  if (existing.source === "order") return errorResponse(409, "주문 입고로 만든 기록은 삭제할 수 없어요");
  await db.delete(purchases).where(eq(purchases.id, id));
  return Response.json({ id });
}
