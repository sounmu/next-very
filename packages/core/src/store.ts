import { z } from 'zod';
import { TimestampSchema, UnitSchema } from './schemas';
import type { Unit } from './types';

export type Industry = 'pasta' | 'cafe' | 'bunsik';
export const IndustrySchema = z.enum(['pasta', 'cafe', 'bunsik']) satisfies z.ZodType<Industry>;

export const INDUSTRIES: readonly { id: Industry; name: string; description: string }[] = [
  { id: 'pasta', name: '파스타', description: '파스타·양식 메뉴를 판매해요' },
  { id: 'cafe', name: '카페', description: '커피·음료를 판매해요' },
  { id: 'bunsik', name: '분식', description: '떡볶이·김밥 등 분식 메뉴를 판매해요' },
];

export const StoreSetupSchema = z.object({
  name: z.string().trim().min(1),
  sido: z.string().min(1),
  sigungu: z.string().min(1),
  industry: IndustrySchema,
});
export type StoreSetup = z.infer<typeof StoreSetupSchema>;

export const StoreProfileSchema = StoreSetupSchema.extend({
  id: z.string().min(1),
  onboardedAt: TimestampSchema,
});
export type StoreProfile = z.infer<typeof StoreProfileSchema>;

export const StoreRecipeLineSchema = z.object({
  ingredientName: z.string().trim().min(1),
  amount: z.number().positive(),
  unit: UnitSchema,
  /** Count noun shown instead of 개 when unit is 'ea', e.g. 장, 봉. */
  countLabel: z.string().min(1).optional(),
});
export type StoreRecipeLine = z.infer<typeof StoreRecipeLineSchema>;

export const StoreMenuSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  servingLabel: z.string().min(1),
  isExample: z.boolean(),
  /** True once the owner saved their own recipe; examples never overwrite it. */
  edited: z.boolean(),
  recipe: z.array(StoreRecipeLineSchema).min(1),
});
export type StoreMenu = z.infer<typeof StoreMenuSchema>;

type PresetLine = readonly [ingredientName: string, amount: number, unit: Unit, countLabel?: string];

const PRESETS: Record<Industry, readonly { key: string; name: string; recipe: readonly PresetLine[] }[]> = {
  pasta: [
    { key: 'aglio-olio', name: '알리오 올리오', recipe: [['스파게티면', 100, 'g'], ['마늘', 15, 'g'], ['올리브오일', 20, 'mL'], ['페페론치노', 1, 'g']] },
    { key: 'tomato', name: '토마토 파스타', recipe: [['스파게티면', 100, 'g'], ['토마토소스', 150, 'g'], ['양파', 30, 'g'], ['올리브오일', 10, 'mL']] },
    { key: 'cream', name: '크림 파스타', recipe: [['스파게티면', 100, 'g'], ['생크림', 100, 'mL'], ['우유', 50, 'mL'], ['베이컨', 40, 'g'], ['양파', 30, 'g']] },
  ],
  cafe: [
    { key: 'americano', name: '아메리카노', recipe: [['원두', 18, 'g'], ['물', 250, 'mL']] },
    { key: 'latte', name: '카페라테', recipe: [['원두', 18, 'g'], ['우유', 200, 'mL']] },
    { key: 'vanilla-latte', name: '바닐라라테', recipe: [['원두', 18, 'g'], ['우유', 200, 'mL'], ['바닐라시럽', 20, 'mL']] },
  ],
  bunsik: [
    { key: 'tteokbokki', name: '떡볶이', recipe: [['떡', 150, 'g'], ['어묵', 40, 'g'], ['고추장', 20, 'g'], ['설탕', 10, 'g'], ['대파', 10, 'g']] },
    { key: 'gimbap', name: '김밥', recipe: [['밥', 150, 'g'], ['김', 1, 'ea', '장'], ['단무지', 20, 'g'], ['당근', 20, 'g'], ['햄', 20, 'g']] },
    { key: 'ramyeon', name: '라면', recipe: [['라면', 1, 'ea', '봉'], ['물', 500, 'mL'], ['대파', 10, 'g']] },
  ],
};

export function presetMenus(industry: Industry): StoreMenu[] {
  return PRESETS[industry].map(({ key, name, recipe }) => ({
    id: `example-${industry}-${key}`,
    name,
    servingLabel: '1인분',
    isExample: true,
    edited: false,
    recipe: recipe.map(([ingredientName, amount, unit, countLabel]) =>
      countLabel ? { ingredientName, amount, unit, countLabel } : { ingredientName, amount, unit },
    ),
  }));
}

export function seedMenusOnce(existing: readonly StoreMenu[], industry: Industry): StoreMenu[] {
  const ids = new Set(existing.map((menu) => menu.id));
  return [...existing, ...presetMenus(industry).filter((menu) => !ids.has(menu.id))];
}
