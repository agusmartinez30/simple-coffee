import { z } from 'zod';
import { isCalendarDate } from '../domain/service-day.js';
import { CANCELLATION_REASONS, ORDER_STATUSES } from '../domain/order.js';

/** Request shapes only. Business rules (quantities, option groups, lengths, table…) live in the domain. */

const id = z.string().min(1).max(64);

const lineSchema = z.object({
  productId: id,
  quantity: z.number(),
  optionIds: z.array(id).max(50).optional(),
  note: z.string().max(1000).nullable().optional(),
});

export const newOrderSchema = z.object({
  tableNumber: z.number().int(),
  customerName: z.string().max(200).nullable().optional(),
  note: z.string().max(1000).nullable().optional(),
  lines: z.array(lineSchema).max(100),
});

export const orderListQuerySchema = z.object({
  /** "YYYY-MM-DD" service day in the venue time zone; today when omitted. */
  date: z.string().refine(isCalendarDate, 'Expected a YYYY-MM-DD date').optional(),
  status: z.enum(ORDER_STATUSES).optional(),
});

export const cancelOrderSchema = z.object({ reason: z.enum(CANCELLATION_REASONS) });

export type NewOrderBody = z.output<typeof newOrderSchema>;
export type OrderListQuery = z.output<typeof orderListQuerySchema>;
export type CancelOrderBody = z.output<typeof cancelOrderSchema>;
