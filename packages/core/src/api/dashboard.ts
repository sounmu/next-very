import { z } from 'zod';
import { BaseUnitSchema, CostAlertSchema, IdSchema, IsoDateSchema, MonthSchema, WonSchema } from '../schemas';
import { MenuWithCostSchema } from './menus';

export const DashboardPriceChangeSchema = z.object({
  ingredientId: IdSchema,
  name: z.string().min(1),
  baseUnit: BaseUnitSchema,
  previousUnitPrice: z.number(),
  currentUnitPrice: z.number(),
  changeRate: z.number(),
  currentDate: IsoDateSchema,
});
export type DashboardPriceChange = z.infer<typeof DashboardPriceChangeSchema>;

/** An extracted invoice that is not confirmed yet. `issueCount` counts items flagged "확인 필요". */
export const NeedsReviewSchema = z.object({
  invoiceId: IdSchema,
  supplier: z.string(),
  date: z.string().nullable(),
  itemCount: z.number().int().nonnegative(),
  issueCount: z.number().int().nonnegative(),
  isDemo: z.boolean(),
});
export type NeedsReview = z.infer<typeof NeedsReviewSchema>;

/**
 * GET /api/dashboard. `monthIsCurrent` is false when the latest data month is not the calendar month.
 * `nextSettleDate` is the day the next 정산하기 will record.
 */
export const DashboardResponseSchema = z.object({
  month: MonthSchema,
  monthIsCurrent: z.boolean(),
  monthSpend: WonSchema,
  purchaseCount: z.number().int().nonnegative(),
  nextSettleDate: IsoDateSchema,
  menus: z.array(MenuWithCostSchema),
  priceChanges: z.array(DashboardPriceChangeSchema),
  needsReview: z.array(NeedsReviewSchema),
  alert: CostAlertSchema.nullable(),
});
export type DashboardResponse = z.infer<typeof DashboardResponseSchema>;
