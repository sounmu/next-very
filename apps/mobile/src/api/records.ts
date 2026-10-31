import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { IngredientResponseSchema, IngredientsResponseSchema, type IngredientCreate } from '@marginlog/core/src/api/ingredients';
import {
  ConfirmResultSchema,
  InvoiceCreateResponseSchema,
  InvoiceDetailResponseSchema,
  InvoicesResponseSchema,
  type ConfirmResult,
  type InvoiceConfirm,
} from '@marginlog/core/src/api/invoices';
import {
  PurchaseResponseSchema,
  PurchasesResponseSchema,
  type PurchaseCreate,
  type PurchaseUpdate,
} from '@marginlog/core/src/api/purchases';
import { z } from 'zod';

import { API_URL, apiFetch } from './client';

export type PurchaseFilter = { q?: string; month?: string };

export const recordKeys = {
  purchases: (filter: PurchaseFilter = {}) => ['purchases', filter] as const,
  invoices: ['invoices'] as const,
  invoice: (id: string) => ['invoices', id] as const,
  ingredients: ['ingredients'] as const,
  confirmResult: (id: string) => ['invoice-confirm', id] as const,
};

/** URL of the original invoice photo (GET /api/invoices/[id]/image). */
export function invoiceImageUrl(id: string): string {
  return `${API_URL}/api/invoices/${encodeURIComponent(id)}/image`;
}

/** GET /api/purchases?q=&month= */
export function usePurchases(filter: PurchaseFilter = {}) {
  return useQuery({
    queryKey: recordKeys.purchases(filter),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filter.q) params.set('q', filter.q);
      if (filter.month) params.set('month', filter.month);
      const query = params.toString();
      return apiFetch(`/api/purchases${query ? `?${query}` : ''}`, undefined, PurchasesResponseSchema);
    },
  });
}

/** One purchase, read from the unfiltered list (the contract has no purchase detail endpoint). */
export function usePurchase(id: string | undefined) {
  const list = usePurchases();
  const purchase = list.data?.purchases.find((item) => item.id === id);
  return { ...list, purchase };
}

/** GET /api/invoices */
export function useInvoices() {
  return useQuery({
    queryKey: recordKeys.invoices,
    queryFn: () => apiFetch('/api/invoices', undefined, InvoicesResponseSchema),
  });
}

/** GET /api/invoices/[id] */
export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: recordKeys.invoice(id ?? ''),
    queryFn: () => apiFetch(`/api/invoices/${encodeURIComponent(id ?? '')}`, undefined, InvoiceDetailResponseSchema),
    enabled: Boolean(id),
  });
}

/** GET /api/ingredients, for the ingredient pickers. */
export function useIngredientOptions() {
  return useQuery({
    queryKey: recordKeys.ingredients,
    queryFn: () => apiFetch('/api/ingredients', undefined, IngredientsResponseSchema),
  });
}

/** Everything a purchase write can change. */
function invalidatePurchaseViews(queryClient: QueryClient) {
  return Promise.all(
    ['purchases', 'invoices', 'dashboard', 'menus', 'ingredients', 'compare'].map((key) =>
      queryClient.invalidateQueries({ queryKey: [key] }),
    ),
  );
}

export type UploadImage = {
  /** Local file uri (native) or blob/data uri (web). */
  uri: string;
  mimeType: string;
  fileName: string;
};

/** POST /api/invoices, multipart with the photo in "image". */
export function useUploadInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (image: UploadImage) => {
      const form = new FormData();
      if (typeof document !== 'undefined') {
        const blob = await (await fetch(image.uri)).blob();
        form.append('image', blob, image.fileName);
      } else {
        // React Native's FormData takes a { uri, name, type } file descriptor.
        form.append('image', { uri: image.uri, name: image.fileName, type: image.mimeType } as unknown as Blob);
      }
      return apiFetch('/api/invoices', { method: 'POST', body: form }, InvoiceCreateResponseSchema);
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]),
  });
}

/** POST /api/invoices/[id]/confirm. The result is cached under ['invoice-confirm', id] for the done screen. */
export function useConfirmInvoice(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: InvoiceConfirm) =>
      apiFetch(
        `/api/invoices/${encodeURIComponent(id)}/confirm`,
        { method: 'POST', body: JSON.stringify(body) },
        ConfirmResultSchema,
      ),
    onSuccess: (result) => {
      queryClient.setQueryData<ConfirmResult>(recordKeys.confirmResult(id), result);
      return invalidatePurchaseViews(queryClient);
    },
  });
}

/** Cached confirm result; never fetched (there is no GET for it). */
export function useConfirmResult(id: string | undefined) {
  return useQuery({
    queryKey: recordKeys.confirmResult(id ?? ''),
    queryFn: (): ConfirmResult | null => null,
    enabled: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

/** POST /api/purchases (manual entry). */
export function useCreatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PurchaseCreate) =>
      apiFetch('/api/purchases', { method: 'POST', body: JSON.stringify(body) }, PurchaseResponseSchema),
    onSuccess: () => invalidatePurchaseViews(queryClient),
  });
}

/** PATCH /api/purchases/[id] */
export function useUpdatePurchase(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PurchaseUpdate) =>
      apiFetch(
        `/api/purchases/${encodeURIComponent(id)}`,
        { method: 'PATCH', body: JSON.stringify(body) },
        PurchaseResponseSchema,
      ),
    onSuccess: () => invalidatePurchaseViews(queryClient),
  });
}

/** DELETE /api/purchases/[id]. 409 for order-linked records; the server's message is in ApiError.message. */
export function useDeletePurchase(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch(`/api/purchases/${encodeURIComponent(id)}`, { method: 'DELETE' }, z.unknown()),
    onSuccess: () => invalidatePurchaseViews(queryClient),
  });
}

/** POST /api/ingredients, from the picker's "새 식재료로 등록" on the manual form. */
export function useCreateIngredient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: IngredientCreate) =>
      apiFetch('/api/ingredients', { method: 'POST', body: JSON.stringify(body) }, IngredientResponseSchema),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ingredients'] }),
  });
}
