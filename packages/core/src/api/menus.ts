import { z } from 'zod';
import {
  IdSchema,
  IngredientSchema,
  IsoDateSchema,
  MenuCostSchema,
  MenuSchema,
  RecipeLineSchema,
  SupplierSchema,
  WonSchema,
} from '../schemas';

/** `sold` is every serving recorded so far. */
export const MenuWithCostSchema = z.object({ menu: MenuSchema, cost: MenuCostSchema, sold: z.number().int().nonnegative() });
export type MenuWithCost = z.infer<typeof MenuWithCostSchema>;

/** GET /api/menus */
export const MenusResponseSchema = z.object({ menus: z.array(MenuWithCostSchema) });
export type MenusResponse = z.infer<typeof MenusResponseSchema>;

/** Stock of one recipe ingredient, base units. `current` is the lot being used, `next` the one after it. */
export const MenuStockSchema = z.object({
  ingredientId: IdSchema,
  remaining: z.number().nonnegative(),
  current: z.object({ date: IsoDateSchema, unitPricePerBase: z.number(), remaining: z.number().nonnegative() }).nullable(),
  next: z.object({ date: IsoDateSchema, unitPricePerBase: z.number() }).nullable(),
});
export type MenuStock = z.infer<typeof MenuStockSchema>;

/**
 * GET /api/menus/[id]. `ingredients` holds the recipe's ingredients and
 * `suppliers` those referenced by `cost.lines[].supplierId`.
 */
export const MenuDetailResponseSchema = z.object({
  menu: MenuSchema,
  cost: MenuCostSchema,
  sold: z.number().int().nonnegative(),
  stock: z.array(MenuStockSchema),
  ingredients: z.array(IngredientSchema),
  suppliers: z.array(SupplierSchema),
});
export type MenuDetailResponse = z.infer<typeof MenuDetailResponseSchema>;

/** Body of POST /api/menus (create) and PUT /api/menus/[id] (replace). */
export const MenuUpsertSchema = z.object({
  name: z.string().trim().min(1),
  price: WonSchema.positive(),
  servingLabel: z.string().trim().min(1),
  recipe: z
    .array(RecipeLineSchema)
    .min(1)
    .refine((lines) => new Set(lines.map((line) => line.ingredientId)).size === lines.length, {
      message: 'duplicate ingredientId in recipe',
    }),
});
export type MenuUpsert = z.infer<typeof MenuUpsertSchema>;

/** Response of POST /api/menus and PUT /api/menus/[id]. */
export const MenuResponseSchema = z.object({ menu: MenuSchema });
export type MenuResponse = z.infer<typeof MenuResponseSchema>;
