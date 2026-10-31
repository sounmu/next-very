import { buildOrder } from "@marginlog/core";
import { CartResponseSchema, type CartResponse } from "@marginlog/core/src/api/shop";
import type { ZodType, output } from "zod";
import type { Db } from "../../../db/client";
import { loadCart, loadState } from "../../../lib/repo";

export const errorResponse = (status: number, error: string): Response => Response.json({ error }, { status });

/**
 * Reads and validates a JSON body. An empty body counts as {} when `optional` is set.
 * Returns a ready 400 response when the body is not JSON or fails the schema.
 */
export async function readJsonBody<S extends ZodType>(
  request: Request,
  schema: S,
  { optional = false }: { optional?: boolean } = {},
): Promise<{ data: output<S> } | { response: Response }> {
  const text = await request.text();
  let raw: unknown = {};
  if (text.trim() !== "") {
    try {
      raw = JSON.parse(text);
    } catch {
      return { response: errorResponse(400, "요청 본문이 올바른 JSON이 아니에요") };
    }
  } else if (!optional) {
    return { response: errorResponse(400, "요청 본문이 비어 있어요") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const path = parsed.error.issues[0]?.path.join(".");
    return { response: errorResponse(400, path ? `요청 값이 올바르지 않아요 (${path})` : "요청 값이 올바르지 않아요") };
  }
  return { data: parsed.data };
}

/** The cart with each product and supplier name, and the order preview from buildOrder. */
export async function loadCartResponse(db: Db): Promise<CartResponse> {
  const cart = await loadCart(db);
  const state = await loadState(db);
  const supplierNames = new Map(state.suppliers.map((s) => [s.id, s.name]));
  const items = cart.flatMap((item) => {
    const product = state.products.find((p) => p.id === item.productId);
    if (!product) return [];
    return [{ ...item, product: { ...product, supplierName: supplierNames.get(product.supplierId) ?? product.supplierId } }];
  });
  return CartResponseSchema.parse({ items, preview: buildOrder(cart, state.products) });
}
