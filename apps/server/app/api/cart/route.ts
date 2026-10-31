import { CartUpsertSchema } from "@marginlog/core/src/api/shop";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../db/client";
import { cartItems, supplierProducts } from "../../../db/schema";
import { requireStore } from "../../../lib/auth";
import { errorResponse, loadCartResponse, readJsonBody } from "./shared";

export const dynamic = "force-dynamic";

// CartUpsertSchema requires quantity >= 1; this route also accepts 0, which removes the item.
const CartPutSchema = CartUpsertSchema.extend({ quantity: z.number().int().min(0) });

export async function GET(request: Request) {
  const db = getDb();
  const auth = await requireStore(db, request);
  if (auth instanceof Response) return auth;
  return Response.json(await loadCartResponse(db, auth.storeId));
}

export async function PUT(request: Request) {
  const db = getDb();
  const auth = await requireStore(db, request);
  if (auth instanceof Response) return auth;
  const body = await readJsonBody(request, CartPutSchema);
  if ("response" in body) return body.response;
  const { productId, quantity } = body.data;

  const [product] = await db
    .select({ id: supplierProducts.id })
    .from(supplierProducts)
    .where(and(eq(supplierProducts.id, productId), eq(supplierProducts.storeId, auth.storeId)));
  if (!product) return errorResponse(404, "상품을 찾을 수 없어요");

  if (quantity === 0) {
    await db.delete(cartItems).where(and(eq(cartItems.storeId, auth.storeId), eq(cartItems.productId, productId)));
  } else {
    await db
      .insert(cartItems)
      .values({ storeId: auth.storeId, productId, quantity })
      .onConflictDoUpdate({ target: [cartItems.storeId, cartItems.productId], set: { quantity } });
  }
  return Response.json(await loadCartResponse(db, auth.storeId));
}

export async function DELETE(request: Request) {
  const db = getDb();
  const auth = await requireStore(db, request);
  if (auth instanceof Response) return auth;
  await db.delete(cartItems).where(eq(cartItems.storeId, auth.storeId));
  return Response.json(await loadCartResponse(db, auth.storeId));
}
