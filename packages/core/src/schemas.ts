import { z } from 'zod';
import type {
  BaseUnit,
  CartItem,
  CostAlert,
  ExtractItem,
  ExtractResult,
  Ingredient,
  Invoice,
  MarketIndex,
  Menu,
  MenuCost,
  MenuCostLine,
  Offer,
  Order,
  OrderLine,
  PriceChange,
  Purchase,
  RecipeLine,
  Supplier,
  SupplierProduct,
  Unit,
} from './types';

/** Shared primitives, reused by the request and response schemas in `api/`. */
export const IdSchema = z.string().min(1);
/** Integer won, never negative. Unit prices per base unit are plain numbers instead. */
export const WonSchema = z.number().int().nonnegative();
/** YYYY-MM-DD */
export const IsoDateSchema = z.iso.date();
/** YYYY-MM */
export const MonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export const TimestampSchema = z.iso.datetime({ offset: true });

export const UnitSchema = z.enum(['g', 'kg', 'mL', 'L', 'ea']) satisfies z.ZodType<Unit>;
export const BaseUnitSchema = z.enum(['g', 'mL', 'ea']) satisfies z.ZodType<BaseUnit>;

export const IngredientSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  spec: z.string().optional(),
  baseUnit: BaseUnitSchema,
  marketCode: z.string().optional(),
  aliases: z.array(z.string()),
}) satisfies z.ZodType<Ingredient>;

export const SupplierSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  phone: z.string().optional(),
  memo: z.string().optional(),
  createdAt: TimestampSchema,
}) satisfies z.ZodType<Supplier>;

export const PurchaseSchema = z.object({
  id: IdSchema,
  ingredientId: IdSchema,
  supplierId: IdSchema,
  date: IsoDateSchema,
  packSize: z.number().positive(),
  packUnit: UnitSchema,
  quantity: z.number().positive(),
  amount: WonSchema,
  status: z.literal('confirmed'),
  source: z.enum(['receipt', 'manual', 'order']),
  invoiceId: z.string().optional(),
  orderLineId: z.string().optional(),
  rawName: z.string().optional(),
}) satisfies z.ZodType<Purchase>;

export const RecipeLineSchema = z.object({
  ingredientId: IdSchema,
  amount: z.number().positive(),
  unit: UnitSchema,
}) satisfies z.ZodType<RecipeLine>;

export const MenuSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  price: WonSchema,
  servingLabel: z.string().min(1),
  recipe: z.array(RecipeLineSchema),
}) satisfies z.ZodType<Menu>;

export const MenuCostLineSchema = z.object({
  ingredientId: IdSchema,
  amount: z.number(),
  unit: UnitSchema,
  baseQty: z.number().nullable(),
  unitPricePerBase: z.number().nullable(),
  priceDate: z.string().nullable(),
  supplierId: z.string().nullable(),
  cost: WonSchema.nullable(),
  previousCost: WonSchema.nullable(),
  issue: z.enum(['no-price', 'unit-mismatch']).nullable(),
}) satisfies z.ZodType<MenuCostLine>;

export const MenuCostSchema = z.object({
  menuId: IdSchema,
  total: WonSchema.nullable(),
  partialTotal: WonSchema,
  ratio: z.number().nullable(),
  previousTotal: WonSchema.nullable(),
  lines: z.array(MenuCostLineSchema),
  missing: z.array(z.string()),
  unitIssues: z.array(z.string()),
}) satisfies z.ZodType<MenuCost>;

export const CostAlertSchema = z.object({
  menuId: IdSchema,
  menuName: z.string(),
  delta: WonSchema,
  ingredientIds: z.array(z.string()),
}) satisfies z.ZodType<CostAlert>;

export const PriceChangeSchema = z.object({
  ingredientId: IdSchema,
  previousUnitPrice: z.number(),
  currentUnitPrice: z.number(),
  changeRate: z.number(),
  currentDate: IsoDateSchema,
  previousDate: IsoDateSchema,
}) satisfies z.ZodType<PriceChange>;

export const MarketIndexSchema = z.object({
  mine: z.array(z.number()),
  market: z.array(z.number()),
}) satisfies z.ZodType<MarketIndex>;

export const ExtractItemSchema = z.object({
  rawName: z.string(),
  packSize: z.number().nullable(),
  packUnit: UnitSchema.nullable(),
  quantity: z.number(),
  unitPrice: WonSchema,
  amount: WonSchema,
  confidence: z.enum(['high', 'low']),
  note: z.string().optional(),
}) satisfies z.ZodType<ExtractItem>;

export const ExtractResultSchema = z.object({
  supplier: z.string(),
  date: z.string(),
  items: z.array(ExtractItemSchema),
  total: WonSchema,
}) satisfies z.ZodType<ExtractResult>;

export const InvoiceSchema = z.object({
  id: IdSchema,
  hasImage: z.boolean(),
  supplierId: z.string().optional(),
  date: z.string().optional(),
  status: z.enum(['extracted', 'confirmed']),
  extraction: ExtractResultSchema,
  isDemo: z.boolean(),
  createdAt: TimestampSchema,
}) satisfies z.ZodType<Invoice>;

export const SupplierProductSchema = z.object({
  id: IdSchema,
  supplierId: IdSchema,
  ingredientId: IdSchema,
  name: z.string().min(1),
  spec: z.string().optional(),
  grade: z.string().optional(),
  origin: z.string().optional(),
  packSize: z.number().positive(),
  packUnit: UnitSchema,
  price: WonSchema,
  shippingFee: WonSchema,
  minOrderAmount: WonSchema,
  deliveryNote: z.string().optional(),
  isDemo: z.boolean(),
}) satisfies z.ZodType<SupplierProduct>;

export const OfferSchema = z.object({
  product: SupplierProductSchema,
  comparable: z.boolean(),
  reason: z.enum(['unit', 'spec']).nullable(),
  unitPricePerBase: z.number().nullable(),
  packs: z.number().int().positive(),
  itemsTotal: WonSchema,
  shippingFee: WonSchema,
  total: WonSchema,
  meetsMinOrder: z.boolean(),
}) satisfies z.ZodType<Offer>;

export const CartItemSchema = z.object({
  productId: IdSchema,
  quantity: z.number().int().min(1),
}) satisfies z.ZodType<CartItem>;

export const OrderLineSchema = z.object({
  id: IdSchema,
  productId: IdSchema,
  supplierId: IdSchema,
  ingredientId: IdSchema,
  name: z.string().min(1),
  packSize: z.number().positive(),
  packUnit: UnitSchema,
  quantity: z.number().int().min(1),
  price: WonSchema,
  amount: WonSchema,
}) satisfies z.ZodType<OrderLine>;

export const OrderSchema = z.object({
  id: IdSchema,
  status: z.enum(['placed', 'received']),
  isDemo: z.literal(true),
  createdAt: TimestampSchema,
  receivedAt: TimestampSchema.optional(),
  lines: z.array(OrderLineSchema),
  itemsTotal: WonSchema,
  shippingTotal: WonSchema,
  total: WonSchema,
}) satisfies z.ZodType<Order>;
