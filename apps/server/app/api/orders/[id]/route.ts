import { OrderResponseSchema } from "@marginlog/core/src/api/shop";
import { getDb } from "../../../../db/client";
import { requireStore } from "../../../../lib/auth";
import { errorResponse } from "../../cart/shared";
import { loadOrder } from "../shared";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const auth = await requireStore(db, request);
  if (auth instanceof Response) return auth;
  const order = await loadOrder(db, auth.storeId, id);
  if (!order) return errorResponse(404, "주문을 찾을 수 없어요");
  return Response.json(OrderResponseSchema.parse({ order }));
}
