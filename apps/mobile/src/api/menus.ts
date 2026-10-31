import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IngredientsResponseSchema } from '@marginlog/core/src/api/ingredients';
import {
  MenuDetailResponseSchema,
  MenuResponseSchema,
  MenusResponseSchema,
  type MenuUpsert,
} from '@marginlog/core/src/api/menus';
import { z } from 'zod';

import { apiFetch } from './client';

export const menuKeys = {
  all: ['menus'] as const,
  detail: (id: string) => ['menus', id] as const,
};

/** GET /api/menus */
export function useMenus() {
  return useQuery({
    queryKey: menuKeys.all,
    queryFn: () => apiFetch('/api/menus', undefined, MenusResponseSchema),
  });
}

/** GET /api/menus/[id] */
export function useMenu(id: string | undefined) {
  return useQuery({
    queryKey: menuKeys.detail(id ?? ''),
    queryFn: () => apiFetch(`/api/menus/${encodeURIComponent(id ?? '')}`, undefined, MenuDetailResponseSchema),
    enabled: Boolean(id),
  });
}

/** GET /api/ingredients, for the recipe ingredient picker. */
export function useRecipeIngredients() {
  return useQuery({
    queryKey: ['ingredients'],
    queryFn: () => apiFetch('/api/ingredients', undefined, IngredientsResponseSchema),
  });
}

function useInvalidateMenus() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['menus'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['ingredients'] }),
    ]);
}

/** POST /api/menus when id is 'new', PUT /api/menus/[id] otherwise. */
export function useSaveMenu(id: string) {
  const invalidate = useInvalidateMenus();
  return useMutation({
    mutationFn: (body: MenuUpsert) =>
      id === 'new'
        ? apiFetch('/api/menus', { method: 'POST', body: JSON.stringify(body) }, MenuResponseSchema)
        : apiFetch(
            `/api/menus/${encodeURIComponent(id)}`,
            { method: 'PUT', body: JSON.stringify(body) },
            MenuResponseSchema,
          ),
    onSuccess: invalidate,
  });
}

/** DELETE /api/menus/[id] */
export function useDeleteMenu(id: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateMenus();
  return useMutation({
    mutationFn: () => apiFetch(`/api/menus/${encodeURIComponent(id)}`, { method: 'DELETE' }, z.unknown()),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: menuKeys.detail(id) });
      return invalidate();
    },
  });
}
