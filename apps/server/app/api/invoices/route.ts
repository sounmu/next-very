import { InvoiceCreateResponseSchema, InvoicesResponseSchema } from "@marginlog/core/src/api/invoices";
import { getPreset } from "@marginlog/core";
import { eq } from "drizzle-orm";
import { getDb } from "../../../db/client";
import { invoiceImages, invoices, suppliers } from "../../../db/schema";
import { requireStore } from "../../../lib/auth";
import { extractInvoice } from "../../../lib/ocr/extract";
import { validateExtract } from "../../../lib/ocr/validate";
import { loadInvoices } from "../../../lib/repo";
import { errorResponse, isIsoDate, toInvoice } from "./shared";

export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export async function GET(request: Request) {
  const db = getDb();
  const auth = await requireStore(db, request);
  if (auth instanceof Response) return auth;
  const status = new URL(request.url).searchParams.get("status");
  if (status !== null && status !== "extracted" && status !== "confirmed") {
    return errorResponse(400, "status는 extracted 또는 confirmed만 쓸 수 있어요");
  }
  const list = await loadInvoices(db, auth.storeId);
  const supplierRows = await db
    .select({ id: suppliers.id, name: suppliers.name })
    .from(suppliers)
    .where(eq(suppliers.storeId, auth.storeId));
  const names = new Map(supplierRows.map((s) => [s.id, s.name]));
  const body = InvoicesResponseSchema.parse({
    invoices: list
      .filter((invoice) => status === null || invoice.status === status)
      .map((invoice) => ({
        ...invoice,
        supplierName: (invoice.supplierId && names.get(invoice.supplierId)) || invoice.extraction.supplier,
      })),
  });
  return Response.json(body);
}

export async function POST(request: Request) {
  const db = getDb();
  const auth = await requireStore(db, request);
  if (auth instanceof Response) return auth;
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse(400, "image 필드가 있는 multipart/form-data로 보내 주세요");
  }
  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) return errorResponse(400, "사진(image)이 필요해요");
  if (file.size > MAX_IMAGE_BYTES) return errorResponse(400, "사진은 4MB 이하만 올릴 수 있어요");

  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "image/jpeg";
  const { result, isDemo } = await extractInvoice(bytes, mime, getPreset(auth.store.preset));
  const extraction = validateExtract(result);

  const printedName = extraction.supplier.trim();
  const supplierRows = await db
    .select({ id: suppliers.id, name: suppliers.name })
    .from(suppliers)
    .where(eq(suppliers.storeId, auth.storeId));
  const supplier = printedName ? supplierRows.find((s) => s.name.trim() === printedName) : undefined;

  const id = `invoice-${crypto.randomUUID()}`;
  const row = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(invoices)
      .values({
        id,
        storeId: auth.storeId,
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

  return Response.json(InvoiceCreateResponseSchema.parse({ invoice: toInvoice(row, true) }), { status: 201 });
}
