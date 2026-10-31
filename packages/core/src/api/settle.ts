import { z } from 'zod';
import { IdSchema, IsoDateSchema } from '../schemas';
import { MenuCostChangeSchema } from './invoices';

export const SettleLineSchema = z.object({
  menuId: IdSchema,
  menuName: z.string(),
  /** Random count drawn for the day; `quantity` is lower when stock ran out. */
  target: z.number().int().nonnegative(),
  quantity: z.number().int().nonnegative(),
});
export type SettleLine = z.infer<typeof SettleLineSchema>;

/** Response of POST /api/settle (no body): one demo day of sales, and the menu costs it moved. */
export const SettleResponseSchema = z.object({
  date: IsoDateSchema,
  nextDate: IsoDateSchema,
  lines: z.array(SettleLineSchema),
  changes: z.array(MenuCostChangeSchema),
});
export type SettleResponse = z.infer<typeof SettleResponseSchema>;
