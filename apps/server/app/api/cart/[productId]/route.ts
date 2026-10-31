import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db/client";
import { cartItems, supplierProducts } from "../../../../db/schema";
import { requireStore } from "../../../../lib/auth";
import { errorResponse, loadCartResponse } from "../shared";

export const dynamic = "force-dynamic";

/** Removes one product from the cart and returns the updated cart. */
export async function DELETE(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const db = getDb();
  const auth = await requireStore(db, request);
  if (auth instanceof Response) return auth;
  const [product] = await db
    .select({ id: supplierProducts.id })
    .from(supplierProducts)
    .where(and(eq(supplierProducts.id, productId), eq(supplierProducts.storeId, auth.storeId)));
  if (!product) return errorResponse(404, "상품을 찾을 수 없어요");
  await db.delete(cartItems).where(and(eq(cartItems.storeId, auth.storeId), eq(cartItems.productId, productId)));
  return Response.json(await loadCartResponse(db, auth.storeId));
}
