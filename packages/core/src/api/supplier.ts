import { z } from 'zod';
import {
  IngredientSchema,
  MenuSchema,
  PurchaseSchema,
  QuoteCreateSchema,
  QuoteSchema,
  SupplierCreateSchema,
  SupplierSchema,
} from '../schemas';

// Request bodies for POST /api/suppliers and POST /api/quotes already live in schemas.ts.
export { QuoteCreateSchema, SupplierCreateSchema };
export type { QuoteCreate, SupplierCreate } from '../schemas';

/** Most recent confirmed unit price per supplier for one ingredient. */
export const LatestBySupplierSchema = z.object({
  supplierId: z.string().min(1),
  unitPrice: z.number().int(),
  date: z.iso.date(),
});
export type LatestBySupplier = z.infer<typeof LatestBySupplierSchema>;

/**
 * GET /api/ingredients/[id] (screens 03, 04).
 * `purchases`: confirmed purchases of this ingredient, date ascending.
 * `menus`: menus whose recipe uses it.
 * `allPurchases`: confirmed purchases of every ingredient those menus use,
 * so the app can run previewWithPrice without another call.
 */
export const IngredientDetailSchema = z.object({
  ingredient: IngredientSchema,
  purchases: z.array(PurchaseSchema),
  suppliers: z.array(SupplierSchema),
  latestBySupplier: z.array(LatestBySupplierSchema),
  quotes: z.array(QuoteSchema),
  menus: z.array(MenuSchema),
  allPurchases: z.array(PurchaseSchema),
});
export type IngredientDetail = z.infer<typeof IngredientDetailSchema>;

/** One week of the 4-week index, first week = 100. */
export const MarketWeekSchema = z.object({
  week: z.number().int().positive(),
  mine: z.number(),
  market: z.number(),
});
export type MarketWeek = z.infer<typeof MarketWeekSchema>;

/** GET /api/market/[ingredientId] (screen 03). `{ available: false }` means "참고 시세 없음". */
export const MarketResponseSchema = z.discriminatedUnion('available', [
  z.object({
    available: z.literal(true),
    source: z.string().min(1),
    isExample: z.boolean(),
    weeks: z.array(MarketWeekSchema),
  }),
  z.object({ available: z.literal(false) }),
]);
export type MarketResponse = z.infer<typeof MarketResponseSchema>;

export const SuppliersResponseSchema = z.object({ suppliers: z.array(SupplierSchema) });
export type SuppliersResponse = z.infer<typeof SuppliersResponseSchema>;

export const SupplierCreateResponseSchema = z.object({ supplier: SupplierSchema });
export type SupplierCreateResponse = z.infer<typeof SupplierCreateResponseSchema>;

export const QuoteCreateResponseSchema = z.object({ quote: QuoteSchema });
export type QuoteCreateResponse = z.infer<typeof QuoteCreateResponseSchema>;
