import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  IngredientDetailResponseSchema,
  IngredientResponseSchema,
  IngredientsResponseSchema,
  type AliasCreate,
  type IngredientCreate,
  type IngredientUpdate,
} from '@marginlog/core/src/api/ingredients';
import { PurchasesResponseSchema } from '@marginlog/core/src/api/purchases';

import { apiFetch } from './client';

/** GET /api/ingredients */
export function useIngredients() {
  return useQuery({
    queryKey: ['ingredients'],
    queryFn: () => apiFetch('/api/ingredients', undefined, IngredientsResponseSchema),
  });
}

/** supplierId -> name from GET /api/purchases; the ingredient list only carries supplierId. */
export function useSupplierNames() {
  return useQuery({
    queryKey: ['purchases', 'all'],
    queryFn: () => apiFetch('/api/purchases', undefined, PurchasesResponseSchema),
    select: (data) => new Map(data.purchases.map((purchase) => [purchase.supplierId, purchase.supplierName])),
  });
}

/** GET /api/ingredients/[id] */
export function useIngredient(id: string) {
  return useQuery({
    queryKey: ['ingredients', id],
    queryFn: () => apiFetch(`/api/ingredients/${encodeURIComponent(id)}`, undefined, IngredientDetailResponseSchema),
    enabled: id.length > 0,
  });
}

/** Ingredient names and aliases appear in menus, comparisons, the dashboard and invoice matching. */
function invalidateIngredientViews(queryClient: QueryClient) {
  return Promise.all(
    [['ingredients'], ['menus'], ['dashboard'], ['compare'], ['purchases'], ['invoices']].map((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    ),
  );
}

/** POST /api/ingredients */
export function useCreateIngredient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: IngredientCreate) =>
      apiFetch('/api/ingredients', { method: 'POST', body: JSON.stringify(body) }, IngredientResponseSchema),
    onSuccess: () => invalidateIngredientViews(queryClient),
  });
}

/** PATCH /api/ingredients/[id]. A refused base unit change comes back as ApiError status 409. */
export function useUpdateIngredient(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: IngredientUpdate) =>
      apiFetch(
        `/api/ingredients/${encodeURIComponent(id)}`,
        { method: 'PATCH', body: JSON.stringify(body) },
        IngredientResponseSchema,
      ),
    onSuccess: () => invalidateIngredientViews(queryClient),
  });
}

/** POST /api/ingredients/[id]/aliases */
export function useAddAlias(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AliasCreate) =>
      apiFetch(
        `/api/ingredients/${encodeURIComponent(id)}/aliases`,
        { method: 'POST', body: JSON.stringify(body) },
        IngredientResponseSchema,
      ),
    onSuccess: () => invalidateIngredientViews(queryClient),
  });
}
