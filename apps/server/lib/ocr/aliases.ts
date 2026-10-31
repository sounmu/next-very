// Printed invoice names -> seed ingredient ids. Only exact matches after
// removing whitespace link automatically; anything else stays unlinked.

const ALIASES: Record<string, string[]> = {
  "pork-shoulder": ["돼지고기 앞다리", "돈앞다리", "앞다리살", "앞다리", "돼지 전지", "돼지고기 앞다리살", "돈전지"],
  rice: ["쌀", "백미", "국내산 쌀"],
  onion: ["양파", "깐양파"],
  "green-onion": ["대파", "파", "실파"],
  "jeyuk-sauce": ["제육 소스", "제육양념", "제육 양념장"],
  kimchi: ["김치", "배추김치", "포기김치"],
  "pork-neck": ["돼지고기 목살", "목살", "돈목살"],
  tofu: ["두부", "찌개두부"],
  egg: ["계란", "달걀", "특란"],
  carrot: ["당근", "흙당근"],
  "cooking-oil": ["식용유", "대두유", "콩기름"],
};

const normalize = (name: string): string => name.replace(/\s+/g, "");

const TABLE = new Map<string, string>(
  Object.entries(ALIASES).flatMap(([id, names]) => names.map((n) => [normalize(n), id] as const)),
);

export function matchIngredient(rawName: string): string | null {
  return TABLE.get(normalize(rawName)) ?? null;
}
