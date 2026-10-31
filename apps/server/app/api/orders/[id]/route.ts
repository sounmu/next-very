import { OrderResponseSchema } from "@marginlog/core/src/api/shop";
import { getDb } from "../../../../db/client";
import { errorResponse } from "../../cart/shared";
import { loadOrder } from "../shared";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await loadOrder(getDb(), id);
  if (!order) return errorResponse(404, "주문을 찾을 수 없어요");
  return Response.json(OrderResponseSchema.parse({ order }));
}
