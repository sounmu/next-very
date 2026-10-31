import { baseOf, currentAndPrevious, isUnit, toBase, unitPricePerBase } from "@marginlog/core";
import { InvoiceDetailResponseSchema, type InvoiceDetailSupplier } from "@marginlog/core/src/api/invoices";
import { getDb } from "../../../../db/client";
import { matchIngredient } from "../../../../lib/ocr/aliases";
import { extractIssues } from "../../../../lib/ocr/validate";
import { loadInvoices, loadState } from "../../../../lib/repo";
import { errorResponse } from "../shared";

export const dynamic = "force-dynamic";

const UNIT_MISMATCH = "단위가 재료 기준 단위와 달라요";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const invoice = (await loadInvoices(db)).find((i) => i.id === id);
  if (!invoice) return errorResponse(404, "명세서를 찾을 수 없어요");

  const state = await loadState(db);
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
  const validation = extractIssues(extraction);

  const items = extraction.items.map((item, index) => {
    const ingredient = matchIngredient(item.rawName, state.ingredients);
    const issues = [...validation[index]];
    let price: number | null = null;
    if (ingredient && item.packSize !== null && item.packUnit !== null && isUnit(item.packUnit)) {
      if (baseOf(item.packUnit) !== ingredient.baseUnit) {
        issues.push(UNIT_MISMATCH);
      } else {
        const packBase = toBase(item.packSize, item.packUnit, ingredient.baseUnit);
        const baseQty = packBase === null ? 0 : packBase * item.quantity;
        price = baseQty > 0 ? item.amount / baseQty : null;
      }
    }
    const latest = ingredient ? currentAndPrevious(ingredient, otherPurchases).current : null;
    return {
      index,
      item,
      suggestedIngredientId: ingredient?.id ?? null,
      ingredientName: ingredient?.name ?? null,
      baseUnit: ingredient?.baseUnit ?? null,
      unitPricePerBase: price,
      previousUnitPricePerBase: latest && ingredient ? unitPricePerBase(latest, ingredient.baseUnit) : null,
      issues,
    };
  });

  return Response.json(InvoiceDetailResponseSchema.parse({ invoice, supplier, items }));
}
