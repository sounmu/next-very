import {
  IngredientDetailSchema,
  MarketResponseSchema,
  QuoteCreateResponseSchema,
  SupplierCreateResponseSchema,
  SuppliersResponseSchema,
  type QuoteCreate,
  type SupplierCreate,
} from '@marginlog/core/src/api/supplier';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from './client';
import { menusQueryKey } from './menus';

export const ingredientQueryKey = (ingredientId: string) => ['ingredient', ingredientId] as const;
export const marketQueryKey = (ingredientId: string) => ['market', ingredientId] as const;
export const suppliersQueryKey = ['suppliers'] as const;

/** GET /api/ingredients/[id]: purchases, suppliers, quotes and the menus using the ingredient (03, 04). */
export function useIngredientDetail(ingredientId: string | undefined) {
  return useQuery({
    queryKey: ingredientQueryKey(ingredientId ?? ''),
    queryFn: () =>
      apiFetch(`/api/ingredients/${encodeURIComponent(ingredientId ?? '')}`, undefined, IngredientDetailSchema),
    enabled: Boolean(ingredientId),
  });
}

/** GET /api/market/[ingredientId]: 4-week index, or `{ available: false }` (03). */
export function useMarket(ingredientId: string | undefined) {
  return useQuery({
    queryKey: marketQueryKey(ingredientId ?? ''),
    queryFn: () => apiFetch(`/api/market/${encodeURIComponent(ingredientId ?? '')}`, undefined, MarketResponseSchema),
    enabled: Boolean(ingredientId),
  });
}

/** GET /api/suppliers: every supplier (04, 06). */
export function useSuppliers() {
  return useQuery({
    queryKey: suppliersQueryKey,
    queryFn: () => apiFetch('/api/suppliers', undefined, SuppliersResponseSchema),
  });
}

/** POST /api/suppliers: create a supplier (04). */
export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SupplierCreate) =>
      apiFetch('/api/suppliers', { method: 'POST', body: JSON.stringify(body) }, SupplierCreateResponseSchema),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: suppliersQueryKey }),
  });
}

/** POST /api/quotes: save a quoted unit price, then refetch 01's menus and 03's ingredient (04). */
export function useCreateQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: QuoteCreate) =>
      apiFetch('/api/quotes', { method: 'POST', body: JSON.stringify(body) }, QuoteCreateResponseSchema),
    onSuccess: (_data, body) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: menusQueryKey }),
        queryClient.invalidateQueries({ queryKey: ingredientQueryKey(body.ingredientId) }),
      ]),
  });
}
