import type { ExtractResult } from "@marginlog/core";
import {
  boolean,
  customType,
  date,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// drizzle-orm 0.45 has no built-in bytea column.
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

const UNITS = ["g", "kg", "mL", "L", "ea"] as const;
const BASE_UNITS = ["g", "mL", "ea"] as const;

// Money is integer won. Pack sizes and amounts are floats in their written unit; unit prices are derived, never stored.

export const ingredients = pgTable("ingredients", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  spec: text("spec"),
  baseUnit: text("base_unit", { enum: BASE_UNITS }).notNull(),
  marketCode: text("market_code"),
});

/** Other spellings of one ingredient, e.g. receipt names. An alias points to exactly one ingredient. */
export const ingredientAliases = pgTable("ingredient_aliases", {
  alias: text("alias").primaryKey(),
  ingredientId: text("ingredient_id")
    .notNull()
    .references(() => ingredients.id, { onDelete: "cascade" }),
});

export const suppliers = pgTable("suppliers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  memo: text("memo"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export const quotes = pgTable("quotes", {
  id: text("id").primaryKey(),
  supplierId: text("supplier_id")
    .notNull()
    .references(() => suppliers.id),
  ingredientId: text("ingredient_id")
    .notNull()
    .references(() => ingredients.id),
  packSize: doublePrecision("pack_size").notNull(),
  packUnit: text("pack_unit", { enum: UNITS }).notNull(),
  price: integer("price").notNull(),
  terms: text("terms"),
  date: date("date", { mode: "string" }).notNull(),
});

/** An image is optional; the demo invoice has none. */
export const invoices = pgTable("invoices", {
  id: text("id").primaryKey(),
  supplierId: text("supplier_id").references(() => suppliers.id),
  date: date("date", { mode: "string" }),
  status: text("status", { enum: ["extracted", "confirmed"] }).notNull(),
  extraction: jsonb("extraction").$type<ExtractResult>().notNull(),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

/** At most one image per invoice. Invoice.hasImage is true when a row exists here. */
export const invoiceImages = pgTable("invoice_images", {
  invoiceId: text("invoice_id")
    .primaryKey()
    .references(() => invoices.id, { onDelete: "cascade" }),
  mime: text("mime").notNull(),
  data: bytea("data").notNull(),
});

/** Demo supplier catalog. */
export const supplierProducts = pgTable("supplier_products", {
  id: text("id").primaryKey(),
  supplierId: text("supplier_id")
    .notNull()
    .references(() => suppliers.id),
  ingredientId: text("ingredient_id")
    .notNull()
    .references(() => ingredients.id),
  name: text("name").notNull(),
  spec: text("spec"),
  grade: text("grade"),
  origin: text("origin"),
  packSize: doublePrecision("pack_size").notNull(),
  packUnit: text("pack_unit", { enum: UNITS }).notNull(),
  price: integer("price").notNull(),
  shippingFee: integer("shipping_fee").notNull().default(0),
  minOrderAmount: integer("min_order_amount").notNull().default(0),
  deliveryNote: text("delivery_note"),
  isDemo: boolean("is_demo").notNull().default(true),
});

/** One cart per store; quantity is packs. */
export const cartItems = pgTable("cart_items", {
  productId: text("product_id")
    .primaryKey()
    .references(() => supplierProducts.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
});

/** Demo orders: no payment, nothing is sent to a supplier. */
export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  status: text("status", { enum: ["placed", "received"] }).notNull(),
  isDemo: boolean("is_demo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  receivedAt: timestamp("received_at", { withTimezone: true, mode: "date" }),
  itemsTotal: integer("items_total").notNull(),
  shippingTotal: integer("shipping_total").notNull(),
  total: integer("total").notNull(),
});

/** Snapshot of the product at order time. */
export const orderLines = pgTable("order_lines", {
  id: text("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => supplierProducts.id),
  supplierId: text("supplier_id")
    .notNull()
    .references(() => suppliers.id),
  ingredientId: text("ingredient_id")
    .notNull()
    .references(() => ingredients.id),
  name: text("name").notNull(),
  packSize: doublePrecision("pack_size").notNull(),
  packUnit: text("pack_unit", { enum: UNITS }).notNull(),
  quantity: integer("quantity").notNull(),
  price: integer("price").notNull(),
  amount: integer("amount").notNull(),
  position: integer("position").notNull().default(0),
});

export const purchases = pgTable(
  "purchases",
  {
    id: text("id").primaryKey(),
    ingredientId: text("ingredient_id")
      .notNull()
      .references(() => ingredients.id),
    supplierId: text("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    date: date("date", { mode: "string" }).notNull(),
    packSize: doublePrecision("pack_size").notNull(),
    packUnit: text("pack_unit", { enum: UNITS }).notNull(),
    quantity: doublePrecision("quantity").notNull(),
    amount: integer("amount").notNull(),
    status: text("status", { enum: ["confirmed"] }).notNull(),
    source: text("source", { enum: ["receipt", "manual", "order"] }).notNull(),
    invoiceId: text("invoice_id").references(() => invoices.id),
    orderLineId: text("order_line_id").references(() => orderLines.id),
    rawName: text("raw_name"),
  },
  // Receiving the same order line twice must fail instead of duplicating the purchase.
  (t) => [uniqueIndex("purchases_order_line_id_unique").on(t.orderLineId)],
);

export const menus = pgTable("menus", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  servingLabel: text("serving_label").notNull().default("1인분"),
});

/** `position` keeps the recipe order the owner entered. */
export const recipeLines = pgTable(
  "recipe_lines",
  {
    menuId: text("menu_id")
      .notNull()
      .references(() => menus.id, { onDelete: "cascade" }),
    ingredientId: text("ingredient_id")
      .notNull()
      .references(() => ingredients.id),
    amount: doublePrecision("amount").notNull(),
    unit: text("unit", { enum: UNITS }).notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.menuId, t.ingredientId] })],
);

/** Servings sold per menu per day. Stock and FIFO cost are derived from purchases minus these, never stored. */
export const sales = pgTable("sales", {
  id: text("id").primaryKey(),
  menuId: text("menu_id")
    .notNull()
    .references(() => menus.id, { onDelete: "cascade" }),
  date: date("date", { mode: "string" }).notNull(),
  quantity: integer("quantity").notNull(),
});

/** 4-week index per ingredient, week 0..3, first week = 100. */
export const marketIndex = pgTable(
  "market_index",
  {
    ingredientId: text("ingredient_id")
      .notNull()
      .references(() => ingredients.id),
    week: integer("week").notNull(),
    mine: integer("mine").notNull(),
    market: integer("market").notNull(),
  },
  (t) => [primaryKey({ columns: [t.ingredientId, t.week] })],
);
