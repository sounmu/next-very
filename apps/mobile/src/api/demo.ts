import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { apiFetch } from './client';

/** POST /api/demo/reset: restore the demo seed, then refetch every query. */
export function useResetDemo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch('/api/demo/reset', { method: 'POST' }, z.unknown()),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
