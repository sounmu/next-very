import { buildOrder } from "@marginlog/core";
import { OrderResponseSchema, OrdersResponseSchema } from "@marginlog/core/src/api/shop";
import { getDb } from "../../../db/client";
import { cartItems, orderLines, orders } from "../../../db/schema";
import { loadCart, loadOrders, loadState } from "../../../lib/repo";
import { errorResponse } from "../cart/shared";
import { loadOrder } from "./shared";

export const dynamic = "force-dynamic";

export async function GET() {
  const list = await loadOrders(getDb());
  return Response.json(OrdersResponseSchema.parse({ orders: list }));
}

/** Orders the whole cart as a demo order. Nothing is paid and nothing is sent to a supplier. */
export async function POST() {
  const db = getDb();
  const cart = await loadCart(db);
  if (cart.length === 0) return errorResponse(400, "장바구니가 비어 있어요");
  const state = await loadState(db);
  const built = buildOrder(cart, state.products);
  const orderId = `order-${crypto.randomUUID()}`;

  await db.transaction(async (tx) => {
    await tx.insert(orders).values({
      id: orderId,
      status: "placed",
      isDemo: true,
      itemsTotal: built.itemsTotal,
      shippingTotal: built.shippingTotal,
      total: built.total,
    });
    await tx.insert(orderLines).values(
      built.lines.map((line, position) => ({
        id: line.id,
        orderId,
        productId: line.productId,
        supplierId: line.supplierId,
        ingredientId: line.ingredientId,
        name: line.name,
        packSize: line.packSize,
        packUnit: line.packUnit,
        quantity: line.quantity,
        price: line.price,
        amount: line.amount,
        position,
      })),
    );
    await tx.delete(cartItems);
  });

  const order = await loadOrder(db, orderId);
  return Response.json(OrderResponseSchema.parse({ order }), { status: 201 });
}
