import { seed } from "@marginlog/core";
import type { Db } from "../db/client";
import {
  ingredients,
  invoiceImages,
  invoices,
  marketIndex,
  menus,
  purchases,
  quotes,
  recipeLines,
  suppliers,
} from "../db/schema";

/** Deletes every row (children first) and inserts the core demo seed, in one transaction. */
export async function resetAndSeed(db: Db): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(purchases);
    await tx.delete(quotes);
    await tx.delete(recipeLines);
    await tx.delete(invoiceImages);
    await tx.delete(marketIndex);
    await tx.delete(invoices);
    await tx.delete(menus);
    await tx.delete(suppliers);
    await tx.delete(ingredients);

    await tx.insert(ingredients).values(
      seed.ingredients.map((i) => ({ id: i.id, name: i.name, spec: i.spec ?? null, marketCode: i.marketCode ?? null })),
    );
    await tx.insert(suppliers).values(
      seed.suppliers.map((s) => ({
        id: s.id,
        name: s.name,
        phone: s.phone ?? null,
        memo: s.memo ?? null,
        createdAt: new Date(s.createdAt),
      })),
    );
    await tx.insert(purchases).values(
      seed.purchases.map((p) => ({
        id: p.id,
        ingredientId: p.ingredientId,
        supplierId: p.supplierId,
        date: p.date,
        packWeightG: p.packWeightG,
        quantity: p.quantity,
        amount: p.amount,
        unitPrice: p.unitPrice,
        status: p.status,
        invoiceId: p.invoiceId ?? null,
      })),
    );
    await tx.insert(menus).values(seed.menus.map((m) => ({ id: m.id, name: m.name, price: m.price, servings: m.servings })));
    await tx.insert(recipeLines).values(
      seed.menus.flatMap((m) =>
        m.recipe.map((line, position) => ({ menuId: m.id, ingredientId: line.ingredientId, grams: line.grams, position })),
      ),
    );
    const marketRows = Object.entries(seed.marketIndex).flatMap(([ingredientId, idx]) =>
      idx.mine.map((mine, week) => ({ ingredientId, week, mine, market: idx.market[week] ?? 100 })),
    );
    if (marketRows.length > 0) await tx.insert(marketIndex).values(marketRows);
  });
}
