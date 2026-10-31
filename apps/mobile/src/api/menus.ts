import { MenusResponseSchema } from '@marginlog/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { apiFetch } from './client';

export const menusQueryKey = ['menus'] as const;

/** GET /api/menus: every menu with its MenuCost, the cost-increase alert, and whether a quote is pending (01, 07). */
export function useMenus() {
  return useQuery({
    queryKey: menusQueryKey,
    queryFn: () => apiFetch('/api/menus', undefined, MenusResponseSchema),
  });
}

/** POST /api/demo/reset: restore the seed data, then refetch every query. 01 binds it to a long press on the title. */
export function useResetDemo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch('/api/demo/reset', { method: 'POST' }, z.unknown()),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
