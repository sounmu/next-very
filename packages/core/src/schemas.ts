import { z } from 'zod';
import type {
  CostAlert,
  ExtractItem,
  ExtractResult,
  Ingredient,
  Invoice,
  Menu,
  MenuCost,
  MenuCostLine,
  Purchase,
  Quote,
  RecipeLine,
  Supplier,
} from './types';

const won = z.number().int();
const grams = z.number().int().positive();
const wonPerKg = z.number().int();
const date = z.iso.date();
const id = z.string().min(1);

export const IngredientSchema = z.object({
  id,
  name: z.string().min(1),
  spec: z.string().optional(),
  marketCode: z.string().optional(),
}) satisfies z.ZodType<Ingredient>;

export const SupplierSchema = z.object({
  id,
  name: z.string().min(1),
  phone: z.string().optional(),
  memo: z.string().optional(),
  createdAt: z.iso.datetime({ offset: true }),
}) satisfies z.ZodType<Supplier>;

export const QuoteSchema = z.object({
  id,
  supplierId: id,
  ingredientId: id,
  unitPrice: wonPerKg.positive(),
  packWeightG: grams,
  terms: z.string().optional(),
  date,
}) satisfies z.ZodType<Quote>;

export const PurchaseSchema = z.object({
  id,
  ingredientId: id,
  supplierId: id,
  date,
  packWeightG: grams,
  quantity: z.number().positive(),
  amount: won.nonnegative(),
  unitPrice: wonPerKg.nonnegative(),
  status: z.enum(['confirmed', 'pending']),
  invoiceId: z.string().optional(),
}) satisfies z.ZodType<Purchase>;

export const ExtractItemSchema = z.object({
  rawName: z.string(),
  packWeightG: z.number().nullable(),
  packUnit: z.string(),
  quantity: z.number(),
  unitPrice: won,
  amount: won,
  confidence: z.enum(['high', 'low']),
  note: z.string().optional(),
}) satisfies z.ZodType<ExtractItem>;

export const ExtractResultSchema = z.object({
  supplier: z.string(),
  date: z.string(),
  items: z.array(ExtractItemSchema),
  total: won,
}) satisfies z.ZodType<ExtractResult>;

export const InvoiceSchema = z.object({
  id,
  imageId: id,
  supplierId: z.string().optional(),
  date: z.string().optional(),
  status: z.enum(['extracted', 'confirmed']),
  extraction: ExtractResultSchema,
  isDemo: z.boolean(),
}) satisfies z.ZodType<Invoice>;

export const RecipeLineSchema = z.object({
  ingredientId: id,
  grams,
}) satisfies z.ZodType<RecipeLine>;

export const MenuSchema = z.object({
  id,
  name: z.string().min(1),
  price: won.positive(),
  servings: z.literal(1),
  recipe: z.array(RecipeLineSchema),
}) satisfies z.ZodType<Menu>;

export const MenuCostLineSchema = z.object({
  ingredientId: id,
  grams: z.number().int(),
  unitPrice: wonPerKg.nullable(),
  supplierId: z.string().nullable(),
  cost: won.nullable(),
  previousCost: won.nullable(),
}) satisfies z.ZodType<MenuCostLine>;

export const MenuCostSchema = z.object({
  menuId: id,
  total: won.nullable(),
  ratio: z.number().nullable(),
  previousTotal: won.nullable(),
  lines: z.array(MenuCostLineSchema),
  missing: z.array(z.string()),
}) satisfies z.ZodType<MenuCost>;

export const CostAlertSchema = z.object({
  menuId: id,
  menuName: z.string(),
  delta: won,
  ingredientIds: z.array(z.string()),
}) satisfies z.ZodType<CostAlert>;

export const SupplierCreateSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().min(1).optional(),
  memo: z.string().trim().min(1).optional(),
});
export type SupplierCreate = z.infer<typeof SupplierCreateSchema>;

export const QuoteCreateSchema = z.object({
  supplierId: id,
  ingredientId: id,
  unitPrice: wonPerKg.positive(),
  packWeightG: grams,
  terms: z.string().trim().min(1).optional(),
  date,
});
export type QuoteCreate = z.infer<typeof QuoteCreateSchema>;

/** PUT /api/menus/[id]. `servings` is always 1 and is not sent. */
export const MenuUpsertSchema = z.object({
  name: z.string().trim().min(1),
  price: won.positive(),
  recipe: z
    .array(RecipeLineSchema)
    .min(1)
    .refine((lines) => new Set(lines.map((l) => l.ingredientId)).size === lines.length, {
      message: 'duplicate ingredientId in recipe',
    }),
});
export type MenuUpsert = z.infer<typeof MenuUpsertSchema>;

/**
 * POST /api/invoices/[id]/confirm. `items` are the rows after the user's
 * corrections. `supplierId` and `date` fall back to the invoice's when omitted.
 */
export const InvoiceConfirmSchema = z.object({
  supplierId: id.optional(),
  date: date.optional(),
  items: z
    .array(
      z.object({
        ingredientId: id,
        packWeightG: grams,
        quantity: z.number().positive(),
        amount: won.positive(),
      }),
    )
    .min(1),
});
export type InvoiceConfirm = z.infer<typeof InvoiceConfirmSchema>;

export const MenusResponseSchema = z.object({
  menus: z.array(
    z.object({
      menu: MenuSchema,
      cost: MenuCostSchema,
      hasPendingQuote: z.boolean(),
    }),
  ),
  alert: CostAlertSchema.nullable(),
});
export type MenusResponse = z.infer<typeof MenusResponseSchema>;
