import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CartResponseSchema,
  OrderReceiveResponseSchema,
  OrderResponseSchema,
  OrdersResponseSchema,
  ProductsResponseSchema,
  type CartUpsert,
  type ProductListQuery,
} from '@marginlog/core/src/api/shop';

import { IngredientsResponseSchema } from '@marginlog/core/src/api/ingredients';
import type { Order } from '@marginlog/core';

import { apiFetch } from './client';

export const ORDER_STATUS_LABEL: Record<Order['status'], string> = {
  placed: '주문 완료',
  received: '입고 완료',
};

/** Local calendar date (YYYY-MM-DD) of a server timestamp, for formatDateKo. */
export function localDate(timestamp: string): string {
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const shopKeys = {
  products: (query: ProductListQuery) => ['products', query] as const,
  cart: ['cart'] as const,
  orders: ['orders'] as const,
  order: (id: string) => ['orders', id] as const,
};

/** GET /api/products?q=&ingredientId= (demo catalog). */
export function useProducts(query: ProductListQuery = {}) {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.ingredientId) params.set('ingredientId', query.ingredientId);
  const search = params.toString();
  return useQuery({
    queryKey: shopKeys.products(query),
    queryFn: () => apiFetch(`/api/products${search ? `?${search}` : ''}`, undefined, ProductsResponseSchema),
  });
}

/** GET /api/ingredients, for the shop filter chip names and the spec used to mark substitute products. */
export function useShopIngredients() {
  return useQuery({
    queryKey: ['ingredients', 'shop-filter'],
    queryFn: () => apiFetch('/api/ingredients', undefined, IngredientsResponseSchema),
  });
}

/** GET /api/cart */
export function useCart() {
  return useQuery({
    queryKey: shopKeys.cart,
    queryFn: () => apiFetch('/api/cart', undefined, CartResponseSchema),
  });
}

/** PUT /api/cart: set the pack count of one product (adds it when absent). */
export function useSetCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CartUpsert) =>
      apiFetch('/api/cart', { method: 'PUT', body: JSON.stringify(body) }, CartResponseSchema),
    onSuccess: (cart) => queryClient.setQueryData(shopKeys.cart, cart),
  });
}

/** DELETE /api/cart/[productId] */
export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) =>
      apiFetch(`/api/cart/${encodeURIComponent(productId)}`, { method: 'DELETE' }, CartResponseSchema),
    onSuccess: (cart) => queryClient.setQueryData(shopKeys.cart, cart),
  });
}

/** GET /api/orders */
export function useOrders() {
  return useQuery({
    queryKey: shopKeys.orders,
    queryFn: () => apiFetch('/api/orders', undefined, OrdersResponseSchema),
  });
}

/** GET /api/orders/[id] */
export function useOrder(id: string) {
  return useQuery({
    queryKey: shopKeys.order(id),
    queryFn: () => apiFetch(`/api/orders/${encodeURIComponent(id)}`, undefined, OrderResponseSchema),
    enabled: Boolean(id),
  });
}

/** POST /api/orders (no body): orders the whole cart as a demo order. */
export function usePlaceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch('/api/orders', { method: 'POST' }, OrderResponseSchema),
    onSuccess: ({ order }) => {
      queryClient.setQueryData(shopKeys.order(order.id), { order });
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

/** POST /api/orders/[id]/receive: turns each order line into one purchase record. */
export function useReceiveOrder(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch(`/api/orders/${encodeURIComponent(id)}/receive`, { method: 'POST', body: JSON.stringify({}) }, OrderReceiveResponseSchema),
    onSettled: () => {
      for (const key of ['orders', 'purchases', 'dashboard', 'menus', 'ingredients', 'compare']) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });
}
