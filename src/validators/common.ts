import { z } from 'zod';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Must be a valid ObjectId');

export const phone = z
  .string()
  .trim()
  .min(7, 'Phone must be at least 7 characters')
  .max(20, 'Phone must be at most 20 characters')
  .regex(/^[\d\s+\-()]+$/, 'Phone may only contain digits, spaces and + - ( )');

export const email = z.string().trim().toLowerCase().pipe(z.email('Invalid email'));

const isoDay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the YYYY-MM-DD format')
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), 'Invalid date');

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const dateRangeQuery = z
  .object({ from: isoDay.optional(), to: isoDay.optional() })
  .refine((q) => !q.from || !q.to || q.from <= q.to, { message: '`from` must be before `to`', path: ['from'] });

export const searchQuery = z.object({
  search: z.string().trim().max(100).optional(),
});
