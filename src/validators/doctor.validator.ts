import { z } from 'zod';
import { dateRangeQuery, email, paginationQuery, phone, searchQuery } from './common';

const name = z.string().trim().min(2, 'Name must be at least 2 characters').max(100);

export const createDoctorSchema = z.object({
  name,
  specialization: z.string().trim().min(2).max(80),
  hospital: z.string().trim().min(2).max(120),
  phone,
  email,
});

// patientCount is intentionally not accepted - zod strips unknown keys
export const updateDoctorSchema = createDoctorSchema
  .partial()
  .refine((body) => Object.keys(body).length > 0, { message: 'Provide at least one field to update' });

export const DOCTOR_SORTS = ['-createdAt', 'createdAt', 'name', '-name', '-patientCount', 'patientCount'] as const;

export const listDoctorsQuery = z
  .object({
    specialization: z.string().trim().max(80).optional(),
    hospital: z.string().trim().max(120).optional(),
    sort: z.enum(DOCTOR_SORTS).default('-createdAt'),
  })
  .and(searchQuery)
  .and(paginationQuery)
  .and(dateRangeQuery);

export const lookupDoctorsQuery = searchQuery;

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
export type ListDoctorsQuery = z.infer<typeof listDoctorsQuery>;
