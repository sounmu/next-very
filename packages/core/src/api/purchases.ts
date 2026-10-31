import { z } from 'zod';
import {
  BaseUnitSchema,
  IdSchema,
  IsoDateSchema,
  MonthSchema,
  PurchaseSchema,
  UnitSchema,
  WonSchema,
} from '../schemas';

/** Query of GET /api/purchases. `q` matches ingredient, supplier and raw names. */
export const PurchaseListQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  ingredientId: IdSchema.optional(),
  month: MonthSchema.optional(),
});
export type PurchaseListQuery = z.infer<typeof PurchaseListQuerySchema>;

export const PurchaseListItemSchema = PurchaseSchema.extend({
  ingredientName: z.string().min(1),
  supplierName: z.string().min(1),
  baseUnit: BaseUnitSchema,
  /** Null when packUnit has another dimension than the ingredient's base unit. */
  unitPricePerBase: z.number().nullable(),
});
export type PurchaseListItem = z.infer<typeof PurchaseListItemSchema>;

/** GET /api/purchases */
export const PurchasesResponseSchema = z.object({ purchases: z.array(PurchaseListItemSchema) });
export type PurchasesResponse = z.infer<typeof PurchasesResponseSchema>;

const purchaseFields = {
  ingredientId: IdSchema,
  supplierId: IdSchema,
  supplierName: z.string().trim().min(1),
  date: IsoDateSchema,
  packSize: z.number().positive(),
  packUnit: UnitSchema,
  quantity: z.number().positive(),
  amount: WonSchema.positive(),
};

const supplierOnce = (value: { supplierId?: string; supplierName?: string }) =>
  value.supplierId === undefined || value.supplierName === undefined;

/** Body of POST /api/purchases (manual entry). Exactly one of supplierId / supplierName. */
export const PurchaseCreateSchema = z
  .object({
    ...purchaseFields,
    supplierId: purchaseFields.supplierId.optional(),
    supplierName: purchaseFields.supplierName.optional(),
  })
  .refine((value) => (value.supplierId === undefined) !== (value.supplierName === undefined), {
    message: 'send exactly one of supplierId and supplierName',
    path: ['supplierId'],
  });
export type PurchaseCreate = z.infer<typeof PurchaseCreateSchema>;

/** Body of PATCH /api/purchases/[id]. Every field is optional; supplierId and supplierName are exclusive. */
export const PurchaseUpdateSchema = z.object(purchaseFields).partial().refine(supplierOnce, {
  message: 'send at most one of supplierId and supplierName',
  path: ['supplierId'],
});
export type PurchaseUpdate = z.infer<typeof PurchaseUpdateSchema>;

/** Response of POST /api/purchases and PATCH /api/purchases/[id]. */
export const PurchaseResponseSchema = z.object({ purchase: PurchaseSchema });
export type PurchaseResponse = z.infer<typeof PurchaseResponseSchema>;
