import { describe, expect, it } from 'vitest';
import { computeMenuCost } from '../cost';
import { seed } from '../seed';
import {
  IngredientsResponseSchema,
  MenuDetailSchema,
  MenuSaveResponseSchema,
  MenuUpsertSchema,
} from './menu';

const menu = seed.menus[0]!;
const cost = computeMenuCost(menu, seed.purchases);
const recipeIds = new Set(menu.recipe.map((l) => l.ingredientId));
const supplierIds = new Set(cost.lines.flatMap((l) => (l.supplierId === null ? [] : [l.supplierId])));

describe('MenuDetailSchema', () => {
  it('parses the seed jeyuk-deopbap detail', () => {
    const detail = {
      menu,
      cost,
      ingredients: seed.ingredients.filter((i) => recipeIds.has(i.id)),
      suppliers: seed.suppliers.filter((s) => supplierIds.has(s.id)),
    };
    const parsed = MenuDetailSchema.parse(detail);
    expect(parsed.cost.total).toBe(3200);
    expect(parsed.ingredients).toHaveLength(5);
    expect(parsed.suppliers.map((s) => s.id)).toEqual(['daesung']);
  });

  it('rejects a detail without cost', () => {
    expect(MenuDetailSchema.safeParse({ menu, ingredients: [], suppliers: [] }).success).toBe(false);
  });
});

describe('MenuSaveResponseSchema', () => {
  it('parses a saved menu', () => {
    expect(MenuSaveResponseSchema.parse({ menu }).menu.id).toBe(menu.id);
  });
});

describe('IngredientsResponseSchema', () => {
  it('parses the seed ingredient list with priced ids', () => {
    const pricedIds = [...new Set(seed.purchases.filter((p) => p.status === 'confirmed').map((p) => p.ingredientId))];
    const parsed = IngredientsResponseSchema.parse({ ingredients: seed.ingredients, pricedIds });
    expect(parsed.ingredients).toHaveLength(seed.ingredients.length);
    expect(parsed.pricedIds).toHaveLength(seed.ingredients.length);
  });
});

describe('MenuUpsertSchema', () => {
  const valid = { name: '제육덮밥', price: 10000, recipe: menu.recipe };

  it('accepts a valid body', () => {
    expect(MenuUpsertSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an empty recipe', () => {
    expect(MenuUpsertSchema.safeParse({ ...valid, recipe: [] }).success).toBe(false);
  });
});
