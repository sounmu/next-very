import { CartUpsertSchema } from "@marginlog/core/src/api/shop";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../db/client";
import { cartItems, supplierProducts } from "../../../db/schema";
import { errorResponse, loadCartResponse, readJsonBody } from "./shared";

export const dynamic = "force-dynamic";

// CartUpsertSchema requires quantity >= 1; this route also accepts 0, which removes the item.
const CartPutSchema = CartUpsertSchema.extend({ quantity: z.number().int().min(0) });

export async function GET() {
  return Response.json(await loadCartResponse(getDb()));
}

export async function PUT(request: Request) {
  const body = await readJsonBody(request, CartPutSchema);
  if ("response" in body) return body.response;
  const { productId, quantity } = body.data;

  const db = getDb();
  const [product] = await db.select({ id: supplierProducts.id }).from(supplierProducts).where(eq(supplierProducts.id, productId));
  if (!product) return errorResponse(404, "상품을 찾을 수 없어요");

  if (quantity === 0) {
    await db.delete(cartItems).where(eq(cartItems.productId, productId));
  } else {
    await db
      .insert(cartItems)
      .values({ productId, quantity })
      .onConflictDoUpdate({ target: cartItems.productId, set: { quantity } });
  }
  return Response.json(await loadCartResponse(db));
}

export async function DELETE() {
  const db = getDb();
  await db.delete(cartItems);
  return Response.json(await loadCartResponse(db));
}
