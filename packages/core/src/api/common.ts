import { z } from 'zod';

export const ErrorResponseSchema = z.object({ error: z.string() });
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

/**
 * Every v2 endpoint. Each area file in this folder holds the schemas for its
 * paths; import them by path, e.g. "@marginlog/core/src/api/menus".
 * Error responses of every endpoint are ErrorResponseSchema.
 */
export const API_PATHS = {
  authLogin: 'POST /api/auth/login',
  authLogout: 'POST /api/auth/logout',
  me: 'GET /api/me',
  storeCreate: 'POST /api/store',
  dashboard: 'GET /api/dashboard',
  purchases: 'GET /api/purchases?q=&ingredientId=&month=',
  purchaseCreate: 'POST /api/purchases',
  purchaseUpdate: 'PATCH /api/purchases/[id]',
  ingredients: 'GET /api/ingredients',
  ingredientDetail: 'GET /api/ingredients/[id]',
  ingredientCreate: 'POST /api/ingredients',
  ingredientUpdate: 'PATCH /api/ingredients/[id]',
  aliasCreate: 'POST /api/ingredients/[id]/aliases',
  menus: 'GET /api/menus',
  menuDetail: 'GET /api/menus/[id]',
  menuCreate: 'POST /api/menus',
  menuUpdate: 'PUT /api/menus/[id]',
  invoiceCreate: 'POST /api/invoices (multipart, field "image")',
  invoices: 'GET /api/invoices',
  invoiceDetail: 'GET /api/invoices/[id]',
  invoiceConfirm: 'POST /api/invoices/[id]/confirm',
  compare: 'GET /api/compare',
  compareDetail: 'GET /api/compare/[ingredientId]?need=<baseQty>',
  products: 'GET /api/products?q=&ingredientId=',
  cart: 'GET /api/cart',
  cartUpsert: 'PUT /api/cart',
  cartRemove: 'DELETE /api/cart/[productId]',
  orders: 'GET /api/orders',
  orderCreate: 'POST /api/orders (no body, orders the whole cart)',
  orderDetail: 'GET /api/orders/[id]',
  orderReceive: 'POST /api/orders/[id]/receive',
  settle: 'POST /api/settle (no body, records one demo day of sales)',
} as const;
export type ApiPathKey = keyof typeof API_PATHS;
