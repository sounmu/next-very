import { MarketResponseSchema } from "@marginlog/core/src/api/supplier";
import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../../db/client";
import { ingredients, marketIndex } from "../../../../db/schema";

export const dynamic = "force-dynamic";

// Fixed example values seeded in market_index, not a live KAMIS lookup.
const SOURCE = "KAMIS 소매가";

export async function GET(_request: Request, { params }: { params: Promise<{ ingredientId: string }> }) {
  const { ingredientId } = await params;
  const db = getDb();

  const [ingredient] = await db
    .select({ marketCode: ingredients.marketCode })
    .from(ingredients)
    .where(eq(ingredients.id, ingredientId))
    .limit(1);
  if (!ingredient) return Response.json({ error: "재료를 찾을 수 없어요" }, { status: 404 });

  const unavailable = () => Response.json(MarketResponseSchema.parse({ available: false }));
  if (!ingredient.marketCode) return unavailable();

  const rows = await db
    .select()
    .from(marketIndex)
    .where(eq(marketIndex.ingredientId, ingredientId))
    .orderBy(asc(marketIndex.week));
  if (rows.length === 0) return unavailable();

  const body = MarketResponseSchema.parse({
    available: true,
    source: SOURCE,
    isExample: true,
    // market_index.week is 0..3, the API week is 1..4.
    weeks: rows.map((r) => ({ week: r.week + 1, mine: r.mine, market: r.market })),
  });
  return Response.json(body);
}
