import {
  IngredientsResponseSchema,
  MenuDetailSchema,
  MenuSaveResponseSchema,
  type MenuUpsert,
} from '@marginlog/core/src/api/menu';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from './client';
import { menusQueryKey } from './menus';

export const ingredientsQueryKey = ['ingredients'] as const;

/** Child of menusQueryKey, so invalidating the list also refetches every open detail. */
export const menuDetailQueryKey = (menuId: string) => [...menusQueryKey, menuId] as const;

/** GET /api/ingredients: every ingredient plus the ids with at least one confirmed purchase (01 names, 08 picker). */
export function useIngredients() {
  return useQuery({
    queryKey: ingredientsQueryKey,
    queryFn: () => apiFetch('/api/ingredients', undefined, IngredientsResponseSchema),
  });
}

/** GET /api/menus/[id]: one menu with its per-ingredient MenuCost, recipe ingredients and their suppliers (02, 08 prefill). */
export function useMenuDetail(menuId: string | undefined) {
  const id = menuId ?? '';
  return useQuery({
    queryKey: menuDetailQueryKey(id),
    queryFn: () => apiFetch(`/api/menus/${encodeURIComponent(id)}`, undefined, MenuDetailSchema),
    enabled: id !== '' && id !== 'new',
  });
}

export type SaveMenuInput = {
  /** "new" creates a menu; any other id updates it. */
  menuId: string;
  body: MenuUpsert;
};

/** PUT /api/menus/[id] (08). On success every menu query, list and details, is refetched. */
export function useSaveMenu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ menuId, body }: SaveMenuInput) =>
      apiFetch(
        `/api/menus/${encodeURIComponent(menuId)}`,
        { method: 'PUT', body: JSON.stringify(body) },
        MenuSaveResponseSchema,
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: menusQueryKey }),
  });
}
