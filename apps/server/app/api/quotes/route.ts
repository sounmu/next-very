import { QuoteCreateResponseSchema, QuoteCreateSchema } from "@marginlog/core/src/api/supplier";
import { eq } from "drizzle-orm";
import { getDb } from "../../../db/client";
import { ingredients, quotes, suppliers } from "../../../db/schema";

export const dynamic = "force-dynamic";

/** Records a supplier's quoted price. Quotes are never an input to cost, so nothing else is written. */
export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "요청 본문이 올바른 JSON이 아니에요" }, { status: 400 });
  }
  const input = QuoteCreateSchema.safeParse(json);
  if (!input.success) return Response.json({ error: "입력값이 올바르지 않아요" }, { status: 400 });

  const db = getDb();
  const [[supplier], [ingredient]] = await Promise.all([
    db.select({ id: suppliers.id }).from(suppliers).where(eq(suppliers.id, input.data.supplierId)).limit(1),
    db.select({ id: ingredients.id }).from(ingredients).where(eq(ingredients.id, input.data.ingredientId)).limit(1),
  ]);
  if (!supplier) return Response.json({ error: "공급처를 찾을 수 없어요" }, { status: 400 });
  if (!ingredient) return Response.json({ error: "재료를 찾을 수 없어요" }, { status: 400 });

  const [created] = await db
    .insert(quotes)
    .values({
      id: crypto.randomUUID(),
      supplierId: input.data.supplierId,
      ingredientId: input.data.ingredientId,
      unitPrice: input.data.unitPrice,
      packWeightG: input.data.packWeightG,
      terms: input.data.terms ?? null,
      date: input.data.date,
    })
    .returning();

  const body = QuoteCreateResponseSchema.parse({
    quote: {
      id: created.id,
      supplierId: created.supplierId,
      ingredientId: created.ingredientId,
      unitPrice: created.unitPrice,
      packWeightG: created.packWeightG,
      terms: created.terms ?? undefined,
      date: created.date,
    },
  });
  return Response.json(body, { status: 201 });
}
