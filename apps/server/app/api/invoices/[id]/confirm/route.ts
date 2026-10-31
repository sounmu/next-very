import { computeMenuCost, unitPriceFromPack, type Purchase } from "@marginlog/core";
import { ConfirmResultSchema, InvoiceConfirmSchema } from "@marginlog/core/src/api/invoice";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db/client";
import { invoices, purchases, suppliers } from "../../../../../db/schema";
import { loadState } from "../../../../../lib/repo";
import { errorResponse, isIsoDate } from "../../shared";

export const dynamic = "force-dynamic";

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return errorResponse(400, "request body must be JSON");
  }
  const parsed = InvoiceConfirmSchema.safeParse(json);
  if (!parsed.success) return errorResponse(400, parsed.error.message);
  const body = parsed.data;

  const db = getDb();
  const before = await loadState(db);
  const ingredientIds = new Set(before.ingredients.map((i) => i.id));
  const unknown = body.items.find((i) => !ingredientIds.has(i.ingredientId));
  if (unknown) return errorResponse(400, `unknown ingredientId: ${unknown.ingredientId}`);

  try {
    const created = await db.transaction(async (tx) => {
      const [invoice] = await tx.select().from(invoices).where(eq(invoices.id, id)).for("update");
      if (!invoice) throw new HttpError(404, "invoice not found");
      if (invoice.status === "confirmed") throw new HttpError(409, "invoice already confirmed");

      const date = body.date ?? invoice.date ?? (isIsoDate(invoice.extraction.date) ? invoice.extraction.date : null);
      if (!date) throw new HttpError(400, "date is required: the invoice has no readable date");

      let supplierId: string | undefined = body.supplierId ?? invoice.supplierId ?? undefined;
      if (body.supplierId && !before.suppliers.some((s) => s.id === body.supplierId)) {
        throw new HttpError(400, `unknown supplierId: ${body.supplierId}`);
      }
      if (!supplierId) {
        const name = invoice.extraction.supplier.trim();
        if (!name) throw new HttpError(400, "supplierId is required: the invoice has no supplier name");
        supplierId = before.suppliers.find((s) => s.name.trim() === name)?.id;
        if (!supplierId) {
          supplierId = `supplier-${crypto.randomUUID()}`;
          await tx.insert(suppliers).values({ id: supplierId, name });
        }
      }

      const purchaseSupplierId = supplierId;
      const rows: Purchase[] = body.items.map((item) => ({
        id: `purchase-${crypto.randomUUID()}`,
        ingredientId: item.ingredientId,
        supplierId: purchaseSupplierId,
        date,
        packWeightG: item.packWeightG,
        quantity: item.quantity,
        amount: item.amount,
        unitPrice: unitPriceFromPack(item.amount, item.quantity, item.packWeightG),
        status: "confirmed",
        invoiceId: id,
      }));
      await tx.insert(purchases).values(rows);
      await tx.update(invoices).set({ status: "confirmed", supplierId, date }).where(eq(invoices.id, id));
      return rows;
    });

    const after = [...before.purchases, ...created];
    const changes = before.menus.flatMap((menu) => {
      const was = computeMenuCost(menu, before.purchases);
      const now = computeMenuCost(menu, after);
      return was.total === now.total ? [] : [{ menuId: menu.id, menuName: menu.name, before: was, after: now }];
    });

    return Response.json(ConfirmResultSchema.parse({ purchases: created, changes }));
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.status, err.message);
    throw err;
  }
}
