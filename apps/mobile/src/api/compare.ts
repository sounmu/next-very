import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CompareDetailResponseSchema,
  CompareResponseSchema,
} from '@marginlog/core/src/api/compare';
import { CartResponseSchema, CartUpsertSchema, type CartUpsert } from '@marginlog/core/src/api/shop';

import { apiFetch } from './client';

/** GET /api/compare: every ingredient with my latest unit price and the recommended offer. */
export function useCompareList() {
  return useQuery({
    queryKey: ['compare'],
    queryFn: () => apiFetch('/api/compare', undefined, CompareResponseSchema),
  });
}

/** GET /api/compare/[ingredientId]?need=: offers for the needed base quantity (server default when omitted). */
export function useCompareDetail(ingredientId: string, need?: number) {
  return useQuery({
    queryKey: ['compare', ingredientId, need ?? null],
    queryFn: () => {
      const query = need === undefined ? '' : `?need=${encodeURIComponent(String(need))}`;
      return apiFetch(`/api/compare/${encodeURIComponent(ingredientId)}${query}`, undefined, CompareDetailResponseSchema);
    },
    enabled: ingredientId.length > 0,
    placeholderData: keepPreviousData,
  });
}

/** PUT /api/cart: sets the pack count of one product in the demo cart. */
export function useCartUpsert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: CartUpsert) =>
      apiFetch('/api/cart', { method: 'PUT', body: JSON.stringify(CartUpsertSchema.parse(item)) }, CartResponseSchema),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });
}
