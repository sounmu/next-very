import type { Invoice } from "@marginlog/core";
import type { invoices } from "../../../db/schema";

export const errorResponse = (status: number, error: string): Response => Response.json({ error }, { status });

export const isIsoDate = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

/** Invoice.imageId equals the invoice id (one image per invoice). Optional fields are absent, never null. */
export function toInvoice(row: typeof invoices.$inferSelect): Invoice {
  return {
    id: row.id,
    imageId: row.id,
    supplierId: row.supplierId ?? undefined,
    date: row.date ?? undefined,
    status: row.status,
    extraction: row.extraction,
    isDemo: row.isDemo,
  };
}
