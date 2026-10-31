import { baseOf, computeMenuCost, consumption, unitLabel, type Ingredient, type Purchase } from "@marginlog/core";
import { ConfirmResultSchema, InvoiceConfirmSchema } from "@marginlog/core/src/api/invoices";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db/client";
import { ingredientAliases, ingredients, invoices, purchases } from "../../../../../db/schema";
import { loadState } from "../../../../../lib/repo";
import { findOrCreateSupplier, handleError, HttpError, isIsoDate, parseBody } from "../../shared";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await parseBody(request, InvoiceConfirmSchema);
    const db = getDb();
    const before = await loadState(db);

    const result = await db.transaction(async (tx) => {
      const [invoice] = await tx.select().from(invoices).where(eq(invoices.id, id)).for("update");
      if (!invoice) throw new HttpError(404, "명세서를 찾을 수 없어요");
      if (invoice.status === "confirmed") throw new HttpError(409, "이미 저장한 명세서예요");

      const extractedDate = isIsoDate(invoice.extraction.date) ? invoice.extraction.date : null;
      const date = body.date ?? invoice.date ?? extractedDate;
      if (!date) throw new HttpError(400, "구매일을 입력해 주세요");

      let supplierId: string;
      if (body.supplierId) {
        if (!before.suppliers.some((s) => s.id === body.supplierId)) throw new HttpError(400, "등록되지 않은 구매처예요");
        supplierId = body.supplierId;
      } else if (body.supplierName) {
        supplierId = await findOrCreateSupplier(tx, body.supplierName);
      } else if (invoice.supplierId) {
        supplierId = invoice.supplierId;
      } else {
        const printed = invoice.extraction.supplier.trim();
        if (!printed) throw new HttpError(400, "구매처를 입력해 주세요");
        supplierId = await findOrCreateSupplier(tx, printed);
      }

      const created: Ingredient[] = [];
      const rows: Purchase[] = [];
      for (const [index, item] of body.items.entries()) {
        let ingredient: Ingredient | undefined;
        if (item.ingredientId) {
          ingredient = before.ingredients.find((i) => i.id === item.ingredientId);
          if (!ingredient) throw new HttpError(400, `${index + 1}번째 품목: 등록되지 않은 재료예요`);
        } else if (item.newIngredient) {
          const spec = item.newIngredient;
          ingredient = created.find((i) => i.name === spec.name && i.baseUnit === spec.baseUnit);
          if (!ingredient) {
            ingredient = { id: `ingredient-${crypto.randomUUID()}`, name: spec.name, spec: spec.spec, baseUnit: spec.baseUnit, aliases: [] };
            await tx.insert(ingredients).values({ id: ingredient.id, name: spec.name, spec: spec.spec ?? null, baseUnit: spec.baseUnit });
            created.push(ingredient);
          }
        }
        if (!ingredient) throw new HttpError(400, `${index + 1}번째 품목: 재료를 골라 주세요`);
        if (baseOf(item.packUnit) !== ingredient.baseUnit) {
          throw new HttpError(
            400,
            `${index + 1}번째 품목: ${ingredient.name}은 ${unitLabel(ingredient.baseUnit)} 단위로 계산해요. 포장 단위를 확인해 주세요`,
          );
        }

        const rawName = item.rawName.trim();
        if (item.saveAlias && rawName !== ingredient.name.trim()) {
          await tx.insert(ingredientAliases).values({ alias: rawName, ingredientId: ingredient.id }).onConflictDoNothing();
        }
        rows.push({
          id: `purchase-${crypto.randomUUID()}`,
          ingredientId: ingredient.id,
          supplierId,
          date,
          packSize: item.packSize,
          packUnit: item.packUnit,
          quantity: item.quantity,
          amount: item.amount,
          status: "confirmed",
          source: "receipt",
          invoiceId: id,
          rawName,
        });
      }

      await tx.insert(purchases).values(rows);
      await tx.update(invoices).set({ status: "confirmed", supplierId, date }).where(eq(invoices.id, id));
      return { rows, created };
    });

    const allIngredients = [...before.ingredients, ...result.created];
    const after = [...before.purchases, ...result.rows];
    const used = consumption(before.menus, before.ingredients, before.sales);
    const changes = before.menus.flatMap((menu) => {
      const was = computeMenuCost(menu, before.ingredients, before.purchases, used);
      const now = computeMenuCost(menu, allIngredients, after, used);
      return was.total === now.total ? [] : [{ menuId: menu.id, menuName: menu.name, before: was, after: now }];
    });

    return Response.json(ConfirmResultSchema.parse({ purchases: result.rows, changes }));
  } catch (err) {
    return handleError(err);
  }
}
