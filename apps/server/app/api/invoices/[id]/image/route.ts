import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db/client";
import { invoiceImages, invoices } from "../../../../../db/schema";
import { requireStore } from "../../../../../lib/auth";
import { errorResponse } from "../../shared";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const auth = await requireStore(db, request);
  if (auth instanceof Response) return auth;
  const [row] = await db
    .select({ mime: invoiceImages.mime, data: invoiceImages.data })
    .from(invoiceImages)
    .innerJoin(invoices, eq(invoices.id, invoiceImages.invoiceId))
    .where(and(eq(invoiceImages.invoiceId, id), eq(invoices.storeId, auth.storeId)));
  if (!row) return errorResponse(404, "사진이 없어요");
  return new Response(new Uint8Array(row.data), {
    headers: { "Content-Type": row.mime, "Cache-Control": "private, max-age=3600" },
  });
}
