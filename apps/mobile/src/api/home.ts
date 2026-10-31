import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardResponseSchema } from '@marginlog/core/src/api/dashboard';
import { SettleResponseSchema } from '@marginlog/core/src/api/settle';

import { apiFetch } from './client';

/** GET /api/dashboard */
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiFetch('/api/dashboard', undefined, DashboardResponseSchema),
  });
}

/** POST /api/settle: records one demo day of sales; stock and FIFO costs move with it. */
export function useSettle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch('/api/settle', { method: 'POST' }, SettleResponseSchema),
    onSuccess: () =>
      Promise.all(
        ['dashboard', 'menus', 'ingredients', 'compare'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
      ),
  });
}
