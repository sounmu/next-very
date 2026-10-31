import { z } from 'zod';
import { IngredientSchema, MenuCostSchema, MenuSchema, MenuUpsertSchema, SupplierSchema } from '../schemas';

export { MenuUpsertSchema };
export type { MenuUpsert } from '../schemas';

/**
 * GET /api/menus/[id]. `ingredients` holds only the recipe's ingredients and
 * `suppliers` only those referenced by `cost.lines[].supplierId`.
 */
export const MenuDetailSchema = z.object({
  menu: MenuSchema,
  cost: MenuCostSchema,
  ingredients: z.array(IngredientSchema),
  suppliers: z.array(SupplierSchema),
});
export type MenuDetail = z.infer<typeof MenuDetailSchema>;

/** PUT /api/menus/[id] response. The request body is MenuUpsertSchema; id "new" creates. */
export const MenuSaveResponseSchema = z.object({
  menu: MenuSchema,
});
export type MenuSaveResponse = z.infer<typeof MenuSaveResponseSchema>;

/** GET /api/ingredients. `pricedIds` are ingredients with at least one confirmed purchase. */
export const IngredientsResponseSchema = z.object({
  ingredients: z.array(IngredientSchema),
  pricedIds: z.array(z.string()),
});
export type IngredientsResponse = z.infer<typeof IngredientsResponseSchema>;
