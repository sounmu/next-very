import { z } from 'zod';
import {
  ExtractItemSchema,
  InvoiceConfirmSchema,
  InvoiceSchema,
  MenuCostSchema,
  PurchaseSchema,
} from '../schemas';

// POST /api/invoices takes multipart/form-data with the photo in the field
// "image", so it has no JSON request schema.

export const InvoiceCreateResponseSchema = z.object({
  invoice: InvoiceSchema,
});
export type InvoiceCreateResponse = z.infer<typeof InvoiceCreateResponseSchema>;

/**
 * One extracted row plus the server's reading of it. `unitPricePerKg` is
 * null when the pack weight is missing. `quote` is the supplier's registered
 * quote for the suggested ingredient, null when there is none.
 */
export const InvoiceDetailItemSchema = z.object({
  /** Position in `invoice.extraction.items`. */
  index: z.number().int().nonnegative(),
  item: ExtractItemSchema,
  suggestedIngredientId: z.string().nullable(),
  ingredientName: z.string().nullable(),
  unitPricePerKg: z.number().int().nullable(),
  previousUnitPrice: z.number().int().nullable(),
  quote: z
    .object({
      supplierId: z.string().min(1),
      unitPrice: z.number().int(),
    })
    .nullable(),
  issues: z.array(z.string()),
});
export type InvoiceDetailItem = z.infer<typeof InvoiceDetailItemSchema>;

/** `id` is null and `registered` false when the printed supplier name matches no registered supplier. */
export const InvoiceDetailSupplierSchema = z.object({
  id: z.string().min(1).nullable(),
  name: z.string(),
  registered: z.boolean(),
});
export type InvoiceDetailSupplier = z.infer<typeof InvoiceDetailSupplierSchema>;

export const InvoiceDetailSchema = z.object({
  invoice: InvoiceSchema,
  supplier: InvoiceDetailSupplierSchema,
  items: z.array(InvoiceDetailItemSchema),
});
export type InvoiceDetail = z.infer<typeof InvoiceDetailSchema>;

export { InvoiceConfirmSchema };
export type { InvoiceConfirm } from '../schemas';

export const MenuCostChangeSchema = z.object({
  menuId: z.string().min(1),
  menuName: z.string(),
  before: MenuCostSchema,
  after: MenuCostSchema,
});
export type MenuCostChange = z.infer<typeof MenuCostChangeSchema>;

export const ConfirmResultSchema = z.object({
  purchases: z.array(PurchaseSchema),
  changes: z.array(MenuCostChangeSchema),
});
export type ConfirmResult = z.infer<typeof ConfirmResultSchema>;
