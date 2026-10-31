import { describe, expect, it } from 'vitest';
import { INDUSTRIES, presetMenus, seedMenusOnce, StoreMenuSchema } from './store';

describe('store setup presets', () => {
  it('prepares three schema-valid 1인분 example menus per industry', () => {
    for (const { id } of INDUSTRIES) {
      const menus = presetMenus(id);
      expect(menus).toHaveLength(3);
      for (const menu of menus) {
        expect(StoreMenuSchema.parse(menu)).toMatchObject({ servingLabel: '1인분', isExample: true, edited: false });
      }
    }
  });

  it('keeps the count nouns of 김 and 라면 on the 개 unit', () => {
    const lines = presetMenus('bunsik').flatMap((menu) => menu.recipe);
    expect(lines.find((line) => line.ingredientName === '김')).toEqual({ ingredientName: '김', amount: 1, unit: 'ea', countLabel: '장' });
    expect(lines.find((line) => line.ingredientName === '라면')).toMatchObject({ amount: 1, unit: 'ea', countLabel: '봉' });
  });

  it('adds the examples once and never overwrites an edited recipe', () => {
    const own = [{ ingredientName: '원두', amount: 20, unit: 'g' as const }];
    const edited = seedMenusOnce([], 'cafe').map((menu) =>
      menu.id === 'example-cafe-latte' ? { ...menu, edited: true, recipe: own } : menu,
    );
    const again = seedMenusOnce(edited, 'cafe');
    expect(again).toHaveLength(3);
    expect(again.find((menu) => menu.id === 'example-cafe-latte')).toMatchObject({ edited: true, recipe: own });
  });
});
