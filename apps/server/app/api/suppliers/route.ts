import type { Supplier } from "@marginlog/core";
import {
  SupplierCreateResponseSchema,
  SupplierCreateSchema,
  SuppliersResponseSchema,
} from "@marginlog/core/src/api/supplier";
import { asc, sql } from "drizzle-orm";
import { getDb } from "../../../db/client";
import { suppliers } from "../../../db/schema";

export const dynamic = "force-dynamic";

function toSupplier(row: typeof suppliers.$inferSelect): Supplier {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? undefined,
    memo: row.memo ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function GET() {
  const rows = await getDb().select().from(suppliers).orderBy(asc(suppliers.createdAt), asc(suppliers.id));
  return Response.json(SuppliersResponseSchema.parse({ suppliers: rows.map(toSupplier) }));
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "요청 본문이 올바른 JSON이 아니에요" }, { status: 400 });
  }
  const input = SupplierCreateSchema.safeParse(json);
  if (!input.success) return Response.json({ error: "입력값이 올바르지 않아요" }, { status: 400 });

  const db = getDb();

  // Same name (case-insensitive, trimmed) returns the existing supplier instead of a second one.
  const [existing] = await db
    .select()
    .from(suppliers)
    .where(sql`lower(trim(${suppliers.name})) = ${input.data.name.toLowerCase()}`)
    .orderBy(asc(suppliers.createdAt), asc(suppliers.id))
    .limit(1);
  if (existing) {
    return Response.json(SupplierCreateResponseSchema.parse({ supplier: toSupplier(existing) }), { status: 200 });
  }

  const [created] = await db
    .insert(suppliers)
    .values({
      id: crypto.randomUUID(),
      name: input.data.name,
      phone: input.data.phone ?? null,
      memo: input.data.memo ?? null,
    })
    .returning();
  return Response.json(SupplierCreateResponseSchema.parse({ supplier: toSupplier(created) }), { status: 201 });
}
