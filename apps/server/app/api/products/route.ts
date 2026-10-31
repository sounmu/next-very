import { toBase } from "@marginlog/core";
import { ProductListQuerySchema, ProductsResponseSchema } from "@marginlog/core/src/api/shop";
import { getDb } from "../../../db/client";
import { requireStore } from "../../../lib/auth";
import { loadState } from "../../../lib/repo";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const db = getDb();
  const auth = await requireStore(db, request);
  if (auth instanceof Response) return auth;

  // "?q=&ingredientId=" sends empty values; treat them as absent.
  const params = Object.fromEntries([...new URL(request.url).searchParams].filter(([, v]) => v.trim() !== ""));
  const query = ProductListQuerySchema.safeParse(params);
  if (!query.success) return Response.json({ error: "검색 조건이 올바르지 않아요" }, { status: 400 });
  const { q, ingredientId } = query.data;

  const state = await loadState(db, auth.storeId);
  const ingredients = new Map(state.ingredients.map((i) => [i.id, i]));
  const suppliers = new Map(state.suppliers.map((s) => [s.id, s.name]));
  const needle = q?.toLowerCase();

  const products = state.products
    .filter((p) => !ingredientId || p.ingredientId === ingredientId)
    .map((p) => {
      const ingredient = ingredients.get(p.ingredientId);
      const supplierName = suppliers.get(p.supplierId) ?? p.supplierId;
      const packBaseQty = ingredient ? toBase(p.packSize, p.packUnit, ingredient.baseUnit) : null;
      return {
        product: {
          ...p,
          supplierName,
          unitPricePerBase: packBaseQty === null ? null : p.price / packBaseQty,
        },
        haystack: [p.name, p.spec, p.grade, p.origin, supplierName, ingredient?.name, ...(ingredient?.aliases ?? [])]
          .filter((s): s is string => Boolean(s))
          .join("\n")
          .toLowerCase(),
      };
    })
    .filter(({ haystack }) => !needle || haystack.includes(needle))
    .map(({ product }) => product);

  return Response.json(ProductsResponseSchema.parse({ products, isDemo: true }));
}
