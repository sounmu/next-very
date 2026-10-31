import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db/client";
import { invoiceImages } from "../../../../../db/schema";
import { errorResponse } from "../../shared";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await getDb().select().from(invoiceImages).where(eq(invoiceImages.invoiceId, id));
  if (!row) return errorResponse(404, "사진이 없어요");
  return new Response(new Uint8Array(row.data), {
    headers: { "Content-Type": row.mime, "Cache-Control": "private, max-age=3600" },
  });
}
