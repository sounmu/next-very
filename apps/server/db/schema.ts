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
} from "drizzle-orm/pg-core";

// drizzle-orm 0.45 has no built-in bytea column.
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

// Money is integer won, weights are integer grams, unit prices are integer won per kg.

export const ingredients = pgTable("ingredients", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  spec: text("spec"),
  marketCode: text("market_code"),
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
  unitPrice: integer("unit_price").notNull(),
  packWeightG: integer("pack_weight_g").notNull(),
  terms: text("terms"),
  date: date("date", { mode: "string" }).notNull(),
});

export const invoices = pgTable("invoices", {
  id: text("id").primaryKey(),
  supplierId: text("supplier_id").references(() => suppliers.id),
  date: date("date", { mode: "string" }),
  status: text("status", { enum: ["extracted", "confirmed"] }).notNull(),
  extraction: jsonb("extraction").$type<ExtractResult>().notNull(),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

/** One image per invoice. Invoice.imageId in core equals the invoice id. */
export const invoiceImages = pgTable("invoice_images", {
  invoiceId: text("invoice_id")
    .primaryKey()
    .references(() => invoices.id, { onDelete: "cascade" }),
  mime: text("mime").notNull(),
  data: bytea("data").notNull(),
});

export const purchases = pgTable("purchases", {
  id: text("id").primaryKey(),
  ingredientId: text("ingredient_id")
    .notNull()
    .references(() => ingredients.id),
  supplierId: text("supplier_id")
    .notNull()
    .references(() => suppliers.id),
  date: date("date", { mode: "string" }).notNull(),
  packWeightG: integer("pack_weight_g").notNull(),
  quantity: doublePrecision("quantity").notNull(),
  amount: integer("amount").notNull(),
  unitPrice: integer("unit_price").notNull(),
  status: text("status", { enum: ["confirmed", "pending"] }).notNull(),
  invoiceId: text("invoice_id").references(() => invoices.id),
});

export const menus = pgTable("menus", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  servings: integer("servings").notNull().default(1),
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
    grams: integer("grams").notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.menuId, t.ingredientId] })],
);

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
