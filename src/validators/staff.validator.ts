import { z } from 'zod';
import { email } from './common';

export const createStaffSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email,
  password: z.string().min(12, 'Use at least 12 characters').max(200),
  role: z.enum(['admin', 'doctor']),
});

export const updateStaffSchema = z.object({ active: z.boolean() });

export const listActivityQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  resource: z.enum(['doctor', 'patient', 'user']).optional(),
  action: z.enum(['created', 'updated', 'deleted', 'imported', 'deactivated']).optional(),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type ListActivityQuery = z.infer<typeof listActivityQuery>;
