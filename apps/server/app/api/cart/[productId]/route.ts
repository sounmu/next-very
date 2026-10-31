import { eq } from "drizzle-orm";
import { getDb } from "../../../../db/client";
import { cartItems, supplierProducts } from "../../../../db/schema";
import { errorResponse, loadCartResponse } from "../shared";

export const dynamic = "force-dynamic";

/** Removes one product from the cart and returns the updated cart. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const db = getDb();
  const [product] = await db.select({ id: supplierProducts.id }).from(supplierProducts).where(eq(supplierProducts.id, productId));
  if (!product) return errorResponse(404, "상품을 찾을 수 없어요");
  await db.delete(cartItems).where(eq(cartItems.productId, productId));
  return Response.json(await loadCartResponse(db));
}
