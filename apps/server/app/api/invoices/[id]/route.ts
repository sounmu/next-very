import { currentAndPrevious, unitPriceFromPack } from "@marginlog/core";
import { InvoiceDetailSchema, type InvoiceDetailSupplier } from "@marginlog/core/src/api/invoice";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../db/client";
import { invoices } from "../../../../db/schema";
import { matchIngredient } from "../../../../lib/ocr/aliases";
import { extractIssues } from "../../../../lib/ocr/validate";
import { loadState } from "../../../../lib/repo";
import { errorResponse, toInvoice } from "../shared";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const [row] = await db.select().from(invoices).where(eq(invoices.id, id));
  if (!row) return errorResponse(404, "invoice not found");

  const state = await loadState(db);
  const invoice = toInvoice(row);
  const extraction = invoice.extraction;

  const printedName = extraction.supplier.trim();
  const known =
    state.suppliers.find((s) => s.id === invoice.supplierId) ??
    (printedName ? state.suppliers.find((s) => s.name.trim() === printedName) : undefined);
  const supplier: InvoiceDetailSupplier = known
    ? { id: known.id, name: known.name, registered: true }
    : { id: null, name: printedName, registered: false };

  // "Previous" means before this invoice, so its own purchases are left out once confirmed.
  const otherPurchases = state.purchases.filter((p) => p.invoiceId !== invoice.id);
  const issues = extractIssues(extraction);

  const items = extraction.items.map((item, index) => {
    const matched = matchIngredient(item.rawName);
    const ingredient = matched ? state.ingredients.find((i) => i.id === matched) : undefined;
    const ingredientId = ingredient?.id ?? null;
    const quote =
      ingredientId && supplier.id
        ? state.quotes.filter((q) => q.supplierId === supplier.id && q.ingredientId === ingredientId).at(-1)
        : undefined;
    return {
      index,
      item,
      suggestedIngredientId: ingredientId,
      ingredientName: ingredient?.name ?? null,
      unitPricePerKg:
        item.packWeightG !== null && item.packWeightG > 0 && item.quantity > 0
          ? unitPriceFromPack(item.amount, item.quantity, item.packWeightG)
          : null,
      previousUnitPrice: ingredientId ? (currentAndPrevious(ingredientId, otherPurchases).current?.unitPrice ?? null) : null,
      quote: quote ? { supplierId: quote.supplierId, unitPrice: quote.unitPrice } : null,
      issues: issues[index],
    };
  });

  return Response.json(InvoiceDetailSchema.parse({ invoice, supplier, items }));
}
