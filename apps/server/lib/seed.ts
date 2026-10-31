import { seed } from "@marginlog/core";
import type { Db } from "../db/client";
import {
  cartItems,
  ingredientAliases,
  ingredients,
  invoiceImages,
  invoices,
  marketIndex,
  menus,
  orderLines,
  orders,
  purchases,
  quotes,
  recipeLines,
  sales,
  supplierProducts,
  suppliers,
} from "../db/schema";

/** Deletes every row (children first) and inserts the core demo seed, in one transaction. */
export async function resetAndSeed(db: Db): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(sales);
    await tx.delete(purchases);
    await tx.delete(cartItems);
    await tx.delete(orderLines);
    await tx.delete(orders);
    await tx.delete(invoiceImages);
    await tx.delete(invoices);
    await tx.delete(quotes);
    await tx.delete(supplierProducts);
    await tx.delete(recipeLines);
    await tx.delete(menus);
    await tx.delete(marketIndex);
    await tx.delete(ingredientAliases);
    await tx.delete(suppliers);
    await tx.delete(ingredients);

    await tx.insert(ingredients).values(
      seed.ingredients.map((i) => ({
        id: i.id,
        name: i.name,
        spec: i.spec ?? null,
        baseUnit: i.baseUnit,
        marketCode: i.marketCode ?? null,
      })),
    );
    const aliasRows = seed.ingredients.flatMap((i) => i.aliases.map((alias) => ({ alias, ingredientId: i.id })));
    if (aliasRows.length > 0) await tx.insert(ingredientAliases).values(aliasRows);

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
        packSize: p.packSize,
        packUnit: p.packUnit,
        quantity: p.quantity,
        amount: p.amount,
        status: p.status,
        source: p.source,
        invoiceId: p.invoiceId ?? null,
        orderLineId: p.orderLineId ?? null,
        rawName: p.rawName ?? null,
      })),
    );

    await tx.insert(menus).values(
      seed.menus.map((m) => ({ id: m.id, name: m.name, price: m.price, servingLabel: m.servingLabel })),
    );
    await tx.insert(recipeLines).values(
      seed.menus.flatMap((m) =>
        m.recipe.map((line, position) => ({
          menuId: m.id,
          ingredientId: line.ingredientId,
          amount: line.amount,
          unit: line.unit,
          position,
        })),
      ),
    );

    await tx.insert(sales).values(
      seed.sales.map((s) => ({ id: s.id, menuId: s.menuId, date: s.date, quantity: s.quantity })),
    );

    await tx.insert(supplierProducts).values(
      seed.products.map((p) => ({
        id: p.id,
        supplierId: p.supplierId,
        ingredientId: p.ingredientId,
        name: p.name,
        spec: p.spec ?? null,
        grade: p.grade ?? null,
        origin: p.origin ?? null,
        packSize: p.packSize,
        packUnit: p.packUnit,
        price: p.price,
        shippingFee: p.shippingFee,
        minOrderAmount: p.minOrderAmount,
        deliveryNote: p.deliveryNote ?? null,
        isDemo: p.isDemo,
      })),
    );

    const marketRows = Object.entries(seed.marketIndex).flatMap(([ingredientId, idx]) =>
      idx.mine.map((mine, week) => ({ ingredientId, week, mine, market: idx.market[week] ?? 100 })),
    );
    if (marketRows.length > 0) await tx.insert(marketIndex).values(marketRows);
  });
}
