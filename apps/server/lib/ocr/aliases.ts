import type { Ingredient } from "@marginlog/core";

// Printed receipt names -> seed ingredient ids, used after the ingredient name and the ingredient_aliases table.
const STATIC_ALIASES: Record<string, string[]> = {
  "pork-shoulder": ["돼지고기 앞다리", "돈앞다리", "앞다리살", "앞다리", "돼지 전지", "돼지고기 앞다리살", "돈전지"],
  rice: ["쌀", "백미", "국내산 쌀"],
  onion: ["양파", "깐양파"],
  "green-onion": ["대파", "실파"],
  "jeyuk-sauce": ["제육 소스", "제육양념", "제육 양념장"],
  kimchi: ["김치", "배추김치", "포기김치"],
  "pork-neck": ["돼지고기 목살", "목살", "돈목살"],
  tofu: ["두부", "찌개두부"],
  egg: ["계란", "달걀", "특란"],
  carrot: ["당근", "흙당근"],
  "cooking-oil": ["식용유", "대두유", "콩기름"],
  milk: ["우유", "흰우유", "우유 1L"],
  "coffee-beans": ["원두", "원두커피"],
};

const compact = (name: string): string => name.replace(/\s+/g, "");

const STATIC_TABLE = new Map<string, string>(
  Object.entries(STATIC_ALIASES).flatMap(([id, names]) => names.map((n) => [compact(n), id] as const)),
);

/** Exact ingredient name, then a saved alias, then the static list. Never a fuzzy match. */
export function matchIngredient(rawName: string, ingredients: readonly Ingredient[]): Ingredient | null {
  const name = rawName.trim();
  if (!name) return null;
  const byName = ingredients.find((i) => i.name.trim() === name);
  if (byName) return byName;
  const byAlias = ingredients.find((i) => i.aliases.some((a) => a.trim() === name));
  if (byAlias) return byAlias;
  const id = STATIC_TABLE.get(compact(name));
  return id ? (ingredients.find((i) => i.id === id) ?? null) : null;
}
