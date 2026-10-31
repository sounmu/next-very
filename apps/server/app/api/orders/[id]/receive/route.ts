import type { Purchase } from "@marginlog/core";
import { OrderReceiveResponseSchema, OrderReceiveSchema } from "@marginlog/core/src/api/shop";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db/client";
import { orderLines, orders, purchases } from "../../../../../db/schema";
import { requireStore } from "../../../../../lib/auth";
import { errorResponse, readJsonBody } from "../../../cart/shared";
import { loadOrder } from "../../shared";

export const dynamic = "force-dynamic";

/** Today in Asia/Seoul as YYYY-MM-DD ("en-CA" formats dates that way). */
const todaySeoul = (): string => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());

const toPurchase = (r: typeof purchases.$inferSelect): Purchase => ({
  id: r.id,
  ingredientId: r.ingredientId,
  supplierId: r.supplierId,
  date: r.date,
  packSize: r.packSize,
  packUnit: r.packUnit,
  quantity: r.quantity,
  amount: r.amount,
  status: r.status,
  source: r.source,
  invoiceId: r.invoiceId ?? undefined,
  orderLineId: r.orderLineId ?? undefined,
  rawName: r.rawName ?? undefined,
});

/** Confirms receipt: one confirmed purchase per order line, once. A second call answers 409. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const auth = await requireStore(db, request);
  if (auth instanceof Response) return auth;
  const body = await readJsonBody(request, OrderReceiveSchema, { optional: true });
  if ("response" in body) return body.response;
  const date = body.data.date ?? todaySeoul();

  const outcome = await db.transaction(async (tx) => {
    // The row lock makes a concurrent second request wait, then see status "received".
    const [order] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.storeId, auth.storeId)))
      .for("update");
    if (!order) return { kind: "missing" as const };
    if (order.status === "received") return { kind: "received" as const };

    const lines = await tx.select().from(orderLines).where(eq(orderLines.orderId, id)).orderBy(orderLines.position);
    const created: Purchase[] = [];
    for (const line of lines) {
      // The unique index on order_line_id is the hard guard; DO NOTHING keeps a stray duplicate from failing the receipt.
      const rows = await tx
        .insert(purchases)
        .values({
          id: `purchase-${crypto.randomUUID()}`,
          storeId: auth.storeId,
          ingredientId: line.ingredientId,
          supplierId: line.supplierId,
          date,
          packSize: line.packSize,
          packUnit: line.packUnit,
          quantity: line.quantity,
          amount: line.amount,
          status: "confirmed",
          source: "order",
          orderLineId: line.id,
          rawName: line.name,
        })
        .onConflictDoNothing({ target: purchases.orderLineId })
        .returning();
      created.push(...rows.map(toPurchase));
    }
    await tx.update(orders).set({ status: "received", receivedAt: new Date() }).where(eq(orders.id, id));
    return { kind: "ok" as const, purchases: created };
  });

  if (outcome.kind === "missing") return errorResponse(404, "주문을 찾을 수 없어요");
  if (outcome.kind === "received") return errorResponse(409, "이미 입고를 확인한 주문이에요");

  const order = await loadOrder(db, auth.storeId, id);
  return Response.json(OrderReceiveResponseSchema.parse({ order, purchases: outcome.purchases }));
}
