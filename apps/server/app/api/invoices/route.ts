import { InvoiceCreateResponseSchema } from "@marginlog/core/src/api/invoice";
import { getDb } from "../../../db/client";
import { invoiceImages, invoices, suppliers } from "../../../db/schema";
import { extractInvoice } from "../../../lib/ocr/extract";
import { validateExtract } from "../../../lib/ocr/validate";
import { errorResponse, isIsoDate, toInvoice } from "./shared";

export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse(400, "multipart/form-data with an image field is required");
  }
  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) return errorResponse(400, "image is required");
  if (file.size > MAX_IMAGE_BYTES) return errorResponse(400, "image must be 4MB or smaller");

  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "image/jpeg";
  const { result, isDemo } = await extractInvoice(bytes, mime);
  const extraction = validateExtract(result);

  const db = getDb();
  const supplierName = extraction.supplier.trim();
  const supplierRows = await db.select({ id: suppliers.id, name: suppliers.name }).from(suppliers);
  const supplier = supplierName ? supplierRows.find((s) => s.name.trim() === supplierName) : undefined;

  const id = crypto.randomUUID();
  const row = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(invoices)
      .values({
        id,
        supplierId: supplier?.id ?? null,
        date: isIsoDate(extraction.date) ? extraction.date : null,
        status: "extracted",
        extraction,
        isDemo,
      })
      .returning();
    await tx.insert(invoiceImages).values({ invoiceId: id, mime, data: bytes });
    return inserted;
  });

  return Response.json(InvoiceCreateResponseSchema.parse({ invoice: toInvoice(row) }));
}
