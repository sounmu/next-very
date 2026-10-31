import type { Ingredient, Menu, Purchase, Quote, Supplier } from "@marginlog/core";
import { asc } from "drizzle-orm";
import type { Db } from "../db/client";
import { ingredients, menus, purchases, quotes, recipeLines, suppliers } from "../db/schema";

export interface State {
  ingredients: Ingredient[];
  suppliers: Supplier[];
  quotes: Quote[];
  purchases: Purchase[];
  menus: Menu[];
}

// Optional fields in core are absent, never null.
const opt = <T>(v: T | null): T | undefined => v ?? undefined;

export async function loadState(db: Db): Promise<State> {
  const [ingredientRows, supplierRows, quoteRows, purchaseRows, menuRows, lineRows] = await Promise.all([
    db.select().from(ingredients).orderBy(asc(ingredients.id)),
    db.select().from(suppliers).orderBy(asc(suppliers.createdAt), asc(suppliers.id)),
    db.select().from(quotes).orderBy(asc(quotes.date), asc(quotes.id)),
    db.select().from(purchases).orderBy(asc(purchases.date), asc(purchases.id)),
    db.select().from(menus).orderBy(asc(menus.id)),
    db.select().from(recipeLines).orderBy(asc(recipeLines.menuId), asc(recipeLines.position)),
  ]);

  return {
    ingredients: ingredientRows.map((r) => ({ id: r.id, name: r.name, spec: opt(r.spec), marketCode: opt(r.marketCode) })),
    suppliers: supplierRows.map((r) => ({
      id: r.id,
      name: r.name,
      phone: opt(r.phone),
      memo: opt(r.memo),
      createdAt: r.createdAt.toISOString(),
    })),
    quotes: quoteRows.map((r) => ({
      id: r.id,
      supplierId: r.supplierId,
      ingredientId: r.ingredientId,
      unitPrice: r.unitPrice,
      packWeightG: r.packWeightG,
      terms: opt(r.terms),
      date: r.date,
    })),
    purchases: purchaseRows.map((r) => ({
      id: r.id,
      ingredientId: r.ingredientId,
      supplierId: r.supplierId,
      date: r.date,
      packWeightG: r.packWeightG,
      quantity: r.quantity,
      amount: r.amount,
      unitPrice: r.unitPrice,
      status: r.status,
      invoiceId: opt(r.invoiceId),
    })),
    menus: menuRows.map((m) => ({
      id: m.id,
      name: m.name,
      price: m.price,
      servings: 1,
      recipe: lineRows
        .filter((l) => l.menuId === m.id)
        .map((l) => ({ ingredientId: l.ingredientId, grams: l.grams })),
    })),
  };
}
