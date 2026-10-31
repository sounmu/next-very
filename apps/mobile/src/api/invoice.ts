import {
  ConfirmResultSchema,
  InvoiceCreateResponseSchema,
  InvoiceDetailSchema,
  type ConfirmResult,
  type InvoiceConfirm,
  type InvoiceDetail,
} from '@marginlog/core/src/api/invoice';
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';

import { API_URL, apiFetch } from './client';

export const invoiceQueryKey = (invoiceId: string) => ['invoice', invoiceId] as const;
/** Where useConfirmInvoice stores its ConfirmResult so 07 can read it after a router.replace. */
export const invoiceConfirmQueryKey = (invoiceId: string) => ['invoice-confirm', invoiceId] as const;

/** GET /api/invoices/[id]/image: the uploaded photo. 06 and 07 show it in a modal. */
export function invoiceImageUrl(invoiceId: string): string {
  return `${API_URL}/api/invoices/${encodeURIComponent(invoiceId)}/image`;
}

/** A local image file ready to upload: the resized JPEG 05 produced. */
export type InvoiceImageFile = {
  uri: string;
  name: string;
  type: string;
};

async function imageFormData(file: InvoiceImageFile): Promise<FormData> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(file.uri)).blob();
    form.append('image', blob, file.name);
  } else {
    // React Native's FormData takes a { uri, name, type } descriptor where the DOM takes a Blob.
    form.append('image', file as unknown as Blob);
  }
  return form;
}

/** POST /api/invoices: upload the photo as multipart field "image", run OCR, get the Invoice (05). */
export function useCreateInvoice() {
  return useMutation({
    mutationFn: async (file: InvoiceImageFile) =>
      apiFetch('/api/invoices', { method: 'POST', body: await imageFormData(file) }, InvoiceCreateResponseSchema),
  });
}

/** GET /api/invoices/[id]: invoice, supplier match, and per row the ingredient suggestion and quote check (06, 07). */
export function useInvoice(invoiceId: string | undefined) {
  return useQuery({
    queryKey: invoiceQueryKey(invoiceId ?? ''),
    queryFn: invoiceId
      ? () => apiFetch(`/api/invoices/${encodeURIComponent(invoiceId)}`, undefined, InvoiceDetailSchema)
      : skipToken,
  });
}

/**
 * POST /api/invoices/[id]/confirm: save the corrected rows as confirmed purchases.
 * On success the ConfirmResult is cached under ["invoice-confirm", id] for 07 and
 * every query is invalidated so 01 and 07 show the new costs.
 */
export function useConfirmInvoice(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: InvoiceConfirm) =>
      apiFetch(
        `/api/invoices/${encodeURIComponent(invoiceId)}/confirm`,
        { method: 'POST', body: JSON.stringify(body) },
        ConfirmResultSchema,
      ),
    onSuccess: async (result) => {
      queryClient.setQueryData<ConfirmResult>(invoiceConfirmQueryKey(invoiceId), result);
      await queryClient.invalidateQueries();
    },
  });
}

/**
 * The ConfirmResult useConfirmInvoice cached for this invoice; `data` is undefined
 * when 07 was opened without confirming (deep link, reload). Never fetches: the
 * server has no endpoint for it, and the observer keeps the entry out of garbage collection.
 */
export function useConfirmResult(invoiceId: string) {
  return useQuery<ConfirmResult>({
    queryKey: invoiceConfirmQueryKey(invoiceId),
    queryFn: skipToken,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export type { ConfirmResult, InvoiceConfirm, InvoiceDetail };
