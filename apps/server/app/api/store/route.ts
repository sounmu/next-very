import { getPreset } from "@marginlog/core";
import { StoreCreateResponseSchema, StoreCreateSchema } from "@marginlog/core/src/api/auth";
import { eq } from "drizzle-orm";
import { getDb } from "../../../db/client";
import { stores } from "../../../db/schema";
import { getAuth } from "../../../lib/auth";
import { insertPreset } from "../../../lib/seed";
import { toStoreInfo } from "../../../lib/storeInfo";

export const dynamic = "force-dynamic";

/**
 * Creates the caller's store as a copy of a preset. A user has at most one store: when one exists
 * (also when a concurrent request just created it) that store comes back unchanged with 200.
 */
export async function POST(request: Request) {
  const db = getDb();
  const auth = await getAuth(db, request);
  if (!auth) return Response.json({ error: "로그인이 필요해요" }, { status: 401 });

  const parsed = StoreCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "가게 이름과 프리셋을 확인해 주세요" }, { status: 400 });
  const input = parsed.data;

  if (auth.store) return Response.json(StoreCreateResponseSchema.parse({ store: toStoreInfo(auth.store) }));

  const storeId = "store-" + crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  const result = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(stores)
      .values({ id: storeId, userId: auth.userId, name: input.name, preset: input.preset, kind: "new" })
      // stores.user_id is unique: a concurrent request that won keeps its store, and this one copies nothing.
      .onConflictDoNothing({ target: stores.userId })
      .returning();
    if (!inserted) {
      const [existing] = await tx.select().from(stores).where(eq(stores.userId, auth.userId));
      if (!existing) throw new Error("store insert conflicted but no store exists");
      return { store: existing, created: false };
    }
    await insertPreset(tx, { storeId, idPrefix: storeId + "-", preset: getPreset(input.preset) });
    return { store: inserted, created: true };
  });

  return Response.json(StoreCreateResponseSchema.parse({ store: toStoreInfo(result.store) }), {
    status: result.created ? 201 : 200,
  });
}
