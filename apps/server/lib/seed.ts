import { hankkiPreset, type Preset } from "@marginlog/core";
import { SHOWCASE_EMAIL } from "@marginlog/core/src/api/auth";
import { eq } from "drizzle-orm";
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
  sessions,
  stores,
  supplierProducts,
  suppliers,
  users,
} from "../db/schema";

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const SHOWCASE_USER_ID = "user-demo";
const SHOWCASE_STORE_ID = "store-hankki";

/**
 * Copies every row of a preset into one store. Every id, and every foreign key pointing at one, gets idPrefix,
 * so several stores can hold the same preset. The showcase store uses "" and keeps the preset ids as they are.
 */
export async function insertPreset(
  tx: Tx,
  { storeId, idPrefix, preset }: { storeId: string; idPrefix: string; preset: Preset },
): Promise<void> {
  const id = (raw: string) => idPrefix + raw;
  const optId = (raw: string | undefined) => (raw === undefined ? null : id(raw));

  if (preset.ingredients.length > 0) {
    await tx.insert(ingredients).values(
      preset.ingredients.map((i) => ({
        id: id(i.id),
        storeId,
        name: i.name,
        spec: i.spec ?? null,
        baseUnit: i.baseUnit,
        marketCode: i.marketCode ?? null,
      })),
    );
  }
  const aliasRows = preset.ingredients.flatMap((i) => i.aliases.map((alias) => ({ alias, ingredientId: id(i.id) })));
  if (aliasRows.length > 0) await tx.insert(ingredientAliases).values(aliasRows);

  if (preset.suppliers.length > 0) {
    await tx.insert(suppliers).values(
      preset.suppliers.map((s) => ({
        id: id(s.id),
        storeId,
        name: s.name,
        phone: s.phone ?? null,
        memo: s.memo ?? null,
        createdAt: new Date(s.createdAt),
      })),
    );
  }

  if (preset.purchases.length > 0) {
    await tx.insert(purchases).values(
      preset.purchases.map((p) => ({
        id: id(p.id),
        storeId,
        ingredientId: id(p.ingredientId),
        supplierId: id(p.supplierId),
        date: p.date,
        packSize: p.packSize,
        packUnit: p.packUnit,
        quantity: p.quantity,
        amount: p.amount,
        status: p.status,
        source: p.source,
        invoiceId: optId(p.invoiceId),
        orderLineId: optId(p.orderLineId),
        rawName: p.rawName ?? null,
      })),
    );
  }

  if (preset.menus.length > 0) {
    await tx.insert(menus).values(
      preset.menus.map((m) => ({ id: id(m.id), storeId, name: m.name, price: m.price, servingLabel: m.servingLabel })),
    );
  }
  const lineRows = preset.menus.flatMap((m) =>
    m.recipe.map((line, position) => ({
      menuId: id(m.id),
      ingredientId: id(line.ingredientId),
      amount: line.amount,
      unit: line.unit,
      position,
    })),
  );
  if (lineRows.length > 0) await tx.insert(recipeLines).values(lineRows);

  if (preset.sales.length > 0) {
    await tx.insert(sales).values(
      preset.sales.map((s) => ({ id: id(s.id), storeId, menuId: id(s.menuId), date: s.date, quantity: s.quantity })),
    );
  }

  if (preset.products.length > 0) {
    await tx.insert(supplierProducts).values(
      preset.products.map((p) => ({
        id: id(p.id),
        storeId,
        supplierId: id(p.supplierId),
        ingredientId: id(p.ingredientId),
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
  }

  const marketRows = Object.entries(preset.marketIndex).flatMap(([ingredientId, idx]) =>
    idx.mine.map((mine, week) => ({ storeId, ingredientId: id(ingredientId), week, mine, market: idx.market[week] ?? 100 })),
  );
  if (marketRows.length > 0) await tx.insert(marketIndex).values(marketRows);
}

async function insertShowcaseStore(tx: Tx): Promise<void> {
  await tx.insert(stores).values({
    id: SHOWCASE_STORE_ID,
    userId: SHOWCASE_USER_ID,
    name: "한끼식당",
    preset: "hankki",
    kind: "showcase",
  });
  await insertPreset(tx, { storeId: SHOWCASE_STORE_ID, idPrefix: "", preset: hankkiPreset });
}

/** Deletes every row of every table (children first) and inserts the showcase user and store, in one transaction. */
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
    await tx.delete(stores);
    await tx.delete(sessions);
    await tx.delete(users);

    await tx.insert(users).values({ id: SHOWCASE_USER_ID, email: SHOWCASE_EMAIL });
    await insertShowcaseStore(tx);
  });
}

/** Puts the showcase store back to the hankki preset. Other users' stores and every session stay as they are. */
export async function resetShowcaseStore(db: Db): Promise<void> {
  await db.transaction(async (tx) => {
    // store_id cascades remove every row of the store.
    await tx.delete(stores).where(eq(stores.id, SHOWCASE_STORE_ID));
    await tx.insert(users).values({ id: SHOWCASE_USER_ID, email: SHOWCASE_EMAIL }).onConflictDoNothing();
    await insertShowcaseStore(tx);
  });
}
