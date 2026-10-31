import { z } from 'zod';
import {
  CartItemSchema,
  IdSchema,
  IsoDateSchema,
  OrderLineSchema,
  OrderSchema,
  PurchaseSchema,
  SupplierProductSchema,
  WonSchema,
} from '../schemas';

/** Query of GET /api/products. */
export const ProductListQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  ingredientId: IdSchema.optional(),
});
export type ProductListQuery = z.infer<typeof ProductListQuerySchema>;

export const ShopProductSchema = SupplierProductSchema.extend({
  supplierName: z.string(),
  /** Null when the pack unit has another dimension than the ingredient's base unit. */
  unitPricePerBase: z.number().nullable(),
});
export type ShopProduct = z.infer<typeof ShopProductSchema>;

/** GET /api/products. The catalog is demo data. */
export const ProductsResponseSchema = z.object({
  products: z.array(ShopProductSchema),
  isDemo: z.literal(true),
});
export type ProductsResponse = z.infer<typeof ProductsResponseSchema>;

export const CartEntrySchema = CartItemSchema.extend({
  product: SupplierProductSchema.extend({ supplierName: z.string() }),
});
export type CartEntry = z.infer<typeof CartEntrySchema>;

export const OrderPreviewSchema = z.object({
  lines: z.array(OrderLineSchema),
  itemsTotal: WonSchema,
  shippingTotal: WonSchema,
  total: WonSchema,
});
export type OrderPreview = z.infer<typeof OrderPreviewSchema>;

/** GET /api/cart. Also the response of PUT /api/cart and DELETE /api/cart/[productId] (the updated cart). */
export const CartResponseSchema = z.object({
  items: z.array(CartEntrySchema),
  preview: OrderPreviewSchema,
});
export type CartResponse = z.infer<typeof CartResponseSchema>;

/** Body of PUT /api/cart: sets the pack count of one product, adding it when absent. */
export const CartUpsertSchema = CartItemSchema;
export type CartUpsert = z.infer<typeof CartUpsertSchema>;

/** GET /api/orders */
export const OrdersResponseSchema = z.object({ orders: z.array(OrderSchema) });
export type OrdersResponse = z.infer<typeof OrdersResponseSchema>;

/** Response of POST /api/orders (no body, orders the whole cart) and GET /api/orders/[id]. */
export const OrderResponseSchema = z.object({ order: OrderSchema });
export type OrderResponse = z.infer<typeof OrderResponseSchema>;

/** Body of POST /api/orders/[id]/receive. `date` is the receiving date and defaults to today. */
export const OrderReceiveSchema = z.object({ date: IsoDateSchema.optional() });
export type OrderReceive = z.infer<typeof OrderReceiveSchema>;

/** Response of POST /api/orders/[id]/receive. */
export const OrderReceiveResponseSchema = z.object({
  order: OrderSchema,
  purchases: z.array(PurchaseSchema),
});
export type OrderReceiveResponse = z.infer<typeof OrderReceiveResponseSchema>;
