import { z } from 'zod';
import { IdSchema, IngredientSchema, OfferSchema, WonSchema } from '../schemas';

export const CompareListItemSchema = z.object({
  ingredient: IngredientSchema,
  latestUnitPrice: z.number().nullable(),
  offerCount: z.number().int().nonnegative(),
  recommended: z
    .object({ productId: IdSchema, supplierName: z.string(), total: WonSchema })
    .nullable(),
});
export type CompareListItem = z.infer<typeof CompareListItemSchema>;

/** GET /api/compare */
export const CompareResponseSchema = z.object({ items: z.array(CompareListItemSchema) });
export type CompareResponse = z.infer<typeof CompareResponseSchema>;

/** Query of GET /api/compare/[ingredientId]. `need` is the needed quantity in the ingredient's base unit. */
export const CompareDetailQuerySchema = z.object({
  need: z.coerce.number().positive().optional(),
});
export type CompareDetailQuery = z.infer<typeof CompareDetailQuerySchema>;

export const CompareOfferSchema = OfferSchema.extend({ supplierName: z.string() });
export type CompareOffer = z.infer<typeof CompareOfferSchema>;

/** GET /api/compare/[ingredientId]. Supplier catalog and prices are demo data. */
export const CompareDetailResponseSchema = z.object({
  ingredient: IngredientSchema,
  neededBaseQty: z.number().positive(),
  myLatest: z
    .object({ unitPricePerBase: z.number(), date: z.string(), supplierName: z.string() })
    .nullable(),
  offers: z.array(CompareOfferSchema),
  recommendedId: IdSchema.nullable(),
  isDemo: z.literal(true),
});
export type CompareDetailResponse = z.infer<typeof CompareDetailResponseSchema>;
