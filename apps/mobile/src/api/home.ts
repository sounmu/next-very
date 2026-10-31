import { useQuery } from '@tanstack/react-query';
import { DashboardResponseSchema } from '@marginlog/core/src/api/dashboard';

import { apiFetch } from './client';

/** GET /api/dashboard */
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiFetch('/api/dashboard', undefined, DashboardResponseSchema),
  });
}
