import { z } from 'zod';
import {
  BaseUnitSchema,
  ExtractItemSchema,
  IdSchema,
  InvoiceSchema,
  IsoDateSchema,
  MenuCostSchema,
  PurchaseSchema,
  UnitSchema,
  WonSchema,
} from '../schemas';

// POST /api/invoices takes multipart/form-data with the photo in the field "image", so it has no JSON request schema.

export const InvoiceCreateResponseSchema = z.object({ invoice: InvoiceSchema });
export type InvoiceCreateResponse = z.infer<typeof InvoiceCreateResponseSchema>;

export const InvoiceListItemSchema = InvoiceSchema.extend({ supplierName: z.string() });
export type InvoiceListItem = z.infer<typeof InvoiceListItemSchema>;

/** GET /api/invoices */
export const InvoicesResponseSchema = z.object({ invoices: z.array(InvoiceListItemSchema) });
export type InvoicesResponse = z.infer<typeof InvoicesResponseSchema>;

/** `id` is null and `registered` false when the printed supplier name matches no registered supplier. */
export const InvoiceDetailSupplierSchema = z.object({
  id: IdSchema.nullable(),
  name: z.string(),
  registered: z.boolean(),
});
export type InvoiceDetailSupplier = z.infer<typeof InvoiceDetailSupplierSchema>;

/**
 * One extracted row plus the server's reading of it. `index` is the position in
 * `invoice.extraction.items`. Unit prices are null when the pack size or unit is missing
 * or in another dimension than the suggested ingredient's base unit. `issues` are the
 * "확인 필요" reasons.
 */
export const InvoiceDetailItemSchema = z.object({
  index: z.number().int().nonnegative(),
  item: ExtractItemSchema,
  suggestedIngredientId: IdSchema.nullable(),
  ingredientName: z.string().nullable(),
  baseUnit: BaseUnitSchema.nullable(),
  unitPricePerBase: z.number().nullable(),
  previousUnitPricePerBase: z.number().nullable(),
  issues: z.array(z.string()),
});
export type InvoiceDetailItem = z.infer<typeof InvoiceDetailItemSchema>;

/** GET /api/invoices/[id] */
export const InvoiceDetailResponseSchema = z.object({
  invoice: InvoiceSchema,
  supplier: InvoiceDetailSupplierSchema,
  items: z.array(InvoiceDetailItemSchema),
});
export type InvoiceDetailResponse = z.infer<typeof InvoiceDetailResponseSchema>;

export const NewIngredientSchema = z.object({
  name: z.string().trim().min(1),
  baseUnit: BaseUnitSchema,
  spec: z.string().trim().min(1).optional(),
});
export type NewIngredient = z.infer<typeof NewIngredientSchema>;

/** One reviewed row. Exactly one of `ingredientId` (existing) and `newIngredient` (create) is set. */
export const InvoiceConfirmItemSchema = z
  .object({
    ingredientId: IdSchema.optional(),
    newIngredient: NewIngredientSchema.optional(),
    rawName: z.string().trim().min(1),
    packSize: z.number().positive(),
    packUnit: UnitSchema,
    quantity: z.number().positive(),
    amount: WonSchema.positive(),
    saveAlias: z.boolean(),
  })
  .refine((item) => (item.ingredientId === undefined) !== (item.newIngredient === undefined), {
    message: 'send exactly one of ingredientId and newIngredient',
    path: ['ingredientId'],
  });
export type InvoiceConfirmItem = z.infer<typeof InvoiceConfirmItemSchema>;

/**
 * Body of POST /api/invoices/[id]/confirm: the rows after the owner's corrections.
 * `supplierId` / `supplierName` (at most one) and `date` fall back to the invoice's when omitted.
 */
export const InvoiceConfirmSchema = z
  .object({
    supplierId: IdSchema.optional(),
    supplierName: z.string().trim().min(1).optional(),
    date: IsoDateSchema.optional(),
    items: z.array(InvoiceConfirmItemSchema).min(1),
  })
  .refine((body) => body.supplierId === undefined || body.supplierName === undefined, {
    message: 'send at most one of supplierId and supplierName',
    path: ['supplierId'],
  });
export type InvoiceConfirm = z.infer<typeof InvoiceConfirmSchema>;

export const MenuCostChangeSchema = z.object({
  menuId: IdSchema,
  menuName: z.string(),
  before: MenuCostSchema,
  after: MenuCostSchema,
});
export type MenuCostChange = z.infer<typeof MenuCostChangeSchema>;

/** Response of POST /api/invoices/[id]/confirm. */
export const ConfirmResultSchema = z.object({
  purchases: z.array(PurchaseSchema),
  changes: z.array(MenuCostChangeSchema),
});
export type ConfirmResult = z.infer<typeof ConfirmResultSchema>;
