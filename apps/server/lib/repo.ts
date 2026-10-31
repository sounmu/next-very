import type {
  CartItem,
  Ingredient,
  Invoice,
  MarketIndex,
  Menu,
  Order,
  Purchase,
  Quote,
  Sale,
  Supplier,
  SupplierProduct,
} from "@marginlog/core";
import { asc, eq } from "drizzle-orm";
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

export interface State {
  ingredients: Ingredient[];
  suppliers: Supplier[];
  purchases: Purchase[];
  menus: Menu[];
  products: SupplierProduct[];
  quotes: Quote[];
  sales: Sale[];
}

// Optional fields in core are absent, never null.
const opt = <T>(v: T | null): T | undefined => v ?? undefined;

// Reads run one at a time: postgres.js 4 hangs when several queries queue on one connection behind the Supabase transaction pooler.
export async function loadState(db: Db): Promise<State> {
  const ingredientRows = await db.select().from(ingredients).orderBy(asc(ingredients.id));
  const aliasRows = await db.select().from(ingredientAliases).orderBy(asc(ingredientAliases.alias));
  const supplierRows = await db.select().from(suppliers).orderBy(asc(suppliers.createdAt), asc(suppliers.id));
  const purchaseRows = await db.select().from(purchases).orderBy(asc(purchases.date), asc(purchases.id));
  const menuRows = await db.select().from(menus).orderBy(asc(menus.id));
  const lineRows = await db.select().from(recipeLines).orderBy(asc(recipeLines.menuId), asc(recipeLines.position));
  const productRows = await db
    .select()
    .from(supplierProducts)
    .orderBy(asc(supplierProducts.ingredientId), asc(supplierProducts.id));
  const quoteRows = await db.select().from(quotes).orderBy(asc(quotes.date), asc(quotes.id));
  const saleRows = await db.select().from(sales).orderBy(asc(sales.date), asc(sales.id));

  return {
    ingredients: ingredientRows.map((r) => ({
      id: r.id,
      name: r.name,
      spec: opt(r.spec),
      baseUnit: r.baseUnit,
      marketCode: opt(r.marketCode),
      aliases: aliasRows.filter((a) => a.ingredientId === r.id).map((a) => a.alias),
    })),
    suppliers: supplierRows.map((r) => ({
      id: r.id,
      name: r.name,
      phone: opt(r.phone),
      memo: opt(r.memo),
      createdAt: r.createdAt.toISOString(),
    })),
    purchases: purchaseRows.map((r) => ({
      id: r.id,
      ingredientId: r.ingredientId,
      supplierId: r.supplierId,
      date: r.date,
      packSize: r.packSize,
      packUnit: r.packUnit,
      quantity: r.quantity,
      amount: r.amount,
      status: r.status,
      source: r.source,
      invoiceId: opt(r.invoiceId),
      orderLineId: opt(r.orderLineId),
      rawName: opt(r.rawName),
    })),
    menus: menuRows.map((m) => ({
      id: m.id,
      name: m.name,
      price: m.price,
      servingLabel: m.servingLabel,
      recipe: lineRows
        .filter((l) => l.menuId === m.id)
        .map((l) => ({ ingredientId: l.ingredientId, amount: l.amount, unit: l.unit })),
    })),
    products: productRows.map((r) => ({
      id: r.id,
      supplierId: r.supplierId,
      ingredientId: r.ingredientId,
      name: r.name,
      spec: opt(r.spec),
      grade: opt(r.grade),
      origin: opt(r.origin),
      packSize: r.packSize,
      packUnit: r.packUnit,
      price: r.price,
      shippingFee: r.shippingFee,
      minOrderAmount: r.minOrderAmount,
      deliveryNote: opt(r.deliveryNote),
      isDemo: r.isDemo,
    })),
    quotes: quoteRows.map((r) => ({
      id: r.id,
      supplierId: r.supplierId,
      ingredientId: r.ingredientId,
      packSize: r.packSize,
      packUnit: r.packUnit,
      price: r.price,
      terms: opt(r.terms),
      date: r.date,
    })),
    sales: saleRows.map((r) => ({ id: r.id, menuId: r.menuId, date: r.date, quantity: r.quantity })),
  };
}

/** Newest first. Image bytes are not loaded; hasImage only says whether one exists. */
export async function loadInvoices(db: Db): Promise<Invoice[]> {
  const rows = await db
    .select({ invoice: invoices, imageId: invoiceImages.invoiceId })
    .from(invoices)
    .leftJoin(invoiceImages, eq(invoiceImages.invoiceId, invoices.id))
    .orderBy(asc(invoices.createdAt), asc(invoices.id));
  return rows.reverse().map(({ invoice: r, imageId }) => ({
    id: r.id,
    hasImage: imageId !== null,
    supplierId: opt(r.supplierId),
    date: opt(r.date),
    status: r.status,
    extraction: r.extraction,
    isDemo: r.isDemo,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function loadCart(db: Db): Promise<CartItem[]> {
  const rows = await db.select().from(cartItems).orderBy(asc(cartItems.productId));
  return rows.map((r) => ({ productId: r.productId, quantity: r.quantity }));
}

/** Newest first, lines in the order they were placed. */
export async function loadOrders(db: Db): Promise<Order[]> {
  const orderRows = await db.select().from(orders).orderBy(asc(orders.createdAt), asc(orders.id));
  const lineRows = await db.select().from(orderLines).orderBy(asc(orderLines.orderId), asc(orderLines.position));
  return orderRows.reverse().map((o) => ({
    id: o.id,
    status: o.status,
    // Every order in this product is a demo order; the column exists so that stays explicit in the data.
    isDemo: true,
    createdAt: o.createdAt.toISOString(),
    receivedAt: o.receivedAt ? o.receivedAt.toISOString() : undefined,
    lines: lineRows
      .filter((l) => l.orderId === o.id)
      .map((l) => ({
        id: l.id,
        productId: l.productId,
        supplierId: l.supplierId,
        ingredientId: l.ingredientId,
        name: l.name,
        packSize: l.packSize,
        packUnit: l.packUnit,
        quantity: l.quantity,
        price: l.price,
        amount: l.amount,
      })),
    itemsTotal: o.itemsTotal,
    shippingTotal: o.shippingTotal,
    total: o.total,
  }));
}

/** null when the ingredient has no index rows. */
export async function loadMarketIndex(db: Db, ingredientId: string): Promise<MarketIndex | null> {
  const rows = await db
    .select()
    .from(marketIndex)
    .where(eq(marketIndex.ingredientId, ingredientId))
    .orderBy(asc(marketIndex.week));
  if (rows.length === 0) return null;
  return { mine: rows.map((r) => r.mine), market: rows.map((r) => r.market) };
}
