import { z } from 'zod';
import {
  BaseUnitSchema,
  IdSchema,
  IngredientSchema,
  IsoDateSchema,
  MarketIndexSchema,
  MenuSchema,
  PurchaseSchema,
} from '../schemas';

export const IngredientListItemSchema = IngredientSchema.extend({
  /** Latest confirmed purchase price in the ingredient's base dimension, null when there is none. */
  latest: z
    .object({ unitPricePerBase: z.number(), date: IsoDateSchema, supplierId: IdSchema })
    .nullable(),
  purchaseCount: z.number().int().nonnegative(),
});
export type IngredientListItem = z.infer<typeof IngredientListItemSchema>;

/** GET /api/ingredients */
export const IngredientsResponseSchema = z.object({ ingredients: z.array(IngredientListItemSchema) });
export type IngredientsResponse = z.infer<typeof IngredientsResponseSchema>;

export const IngredientHistoryItemSchema = PurchaseSchema.extend({
  /** Null when packUnit has another dimension than the ingredient's base unit. */
  unitPricePerBase: z.number().nullable(),
  supplierName: z.string().min(1),
});
export type IngredientHistoryItem = z.infer<typeof IngredientHistoryItemSchema>;

/** GET /api/ingredients/[id]. `menus` are the menus whose recipe uses the ingredient. */
export const IngredientDetailResponseSchema = z.object({
  ingredient: IngredientSchema,
  history: z.array(IngredientHistoryItemSchema),
  menus: z.array(MenuSchema),
  marketIndex: MarketIndexSchema.nullable(),
});
export type IngredientDetailResponse = z.infer<typeof IngredientDetailResponseSchema>;

/** Body of POST /api/ingredients. */
export const IngredientCreateSchema = z.object({
  name: z.string().trim().min(1),
  baseUnit: BaseUnitSchema,
  spec: z.string().trim().min(1).optional(),
});
export type IngredientCreate = z.infer<typeof IngredientCreateSchema>;

/** Body of PATCH /api/ingredients/[id]. */
export const IngredientUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  spec: z.string().trim().min(1).optional(),
  baseUnit: BaseUnitSchema.optional(),
});
export type IngredientUpdate = z.infer<typeof IngredientUpdateSchema>;

/** Body of POST /api/ingredients/[id]/aliases. */
export const AliasCreateSchema = z.object({ alias: z.string().trim().min(1) });
export type AliasCreate = z.infer<typeof AliasCreateSchema>;

/** Response of POST /api/ingredients, PATCH /api/ingredients/[id] and POST /api/ingredients/[id]/aliases. */
export const IngredientResponseSchema = z.object({ ingredient: IngredientSchema });
export type IngredientResponse = z.infer<typeof IngredientResponseSchema>;
