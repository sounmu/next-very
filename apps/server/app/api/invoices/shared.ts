import type { Invoice, Purchase } from "@marginlog/core";
import type { ZodType } from "zod";
import type { Db } from "../../../db/client";
import { suppliers, type invoices, type purchases } from "../../../db/schema";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Existing supplier whose trimmed name matches, else a new one. */
export async function findOrCreateSupplier(db: Db | Tx, name: string): Promise<string> {
  const trimmed = name.trim();
  const rows = await db.select({ id: suppliers.id, name: suppliers.name }).from(suppliers);
  const found = rows.find((s) => s.name.trim() === trimmed);
  if (found) return found.id;
  const id = `supplier-${crypto.randomUUID()}`;
  await db.insert(suppliers).values({ id, name: trimmed });
  return id;
}

export const errorResponse = (status: number, error: string): Response => Response.json({ error }, { status });

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const isIsoDate = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new HttpError(400, "요청 본문은 JSON이어야 해요");
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? `${issue.path.join(".")}: ` : "";
    throw new HttpError(400, `요청 형식이 올바르지 않아요 (${where}${issue?.message ?? "invalid"})`);
  }
  return parsed.data;
}

export function handleError(err: unknown): Response {
  if (err instanceof HttpError) return errorResponse(err.status, err.message);
  throw err;
}

const opt = <T>(v: T | null): T | undefined => v ?? undefined;

export function toInvoice(row: typeof invoices.$inferSelect, hasImage: boolean): Invoice {
  return {
    id: row.id,
    hasImage,
    supplierId: opt(row.supplierId),
    date: opt(row.date),
    status: row.status,
    extraction: row.extraction,
    isDemo: row.isDemo,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toPurchase(row: typeof purchases.$inferSelect): Purchase {
  return {
    id: row.id,
    ingredientId: row.ingredientId,
    supplierId: row.supplierId,
    date: row.date,
    packSize: row.packSize,
    packUnit: row.packUnit,
    quantity: row.quantity,
    amount: row.amount,
    status: row.status,
    source: row.source,
    invoiceId: opt(row.invoiceId),
    orderLineId: opt(row.orderLineId),
    rawName: opt(row.rawName),
  };
}
