import { z } from 'zod';
import { CONDITIONS, GENDERS, STATUSES } from '../models/Patient';
import { dateRangeQuery, email, objectId, paginationQuery, phone, searchQuery } from './common';

const patientFields = {
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  age: z.coerce.number().int('Age must be a whole number').min(0).max(120),
  gender: z.enum(GENDERS),
  phone,
  // forms send "" for an empty optional field; on update it clears the email
  email: z.union([z.literal(''), email]).optional(),
  condition: z.enum(CONDITIONS),
  status: z.enum(STATUSES).default('admitted'),
  admissionDate: z.coerce
    .date()
    // a day of slack for timezones
    .refine((d) => d.getTime() <= Date.now() + 24 * 60 * 60 * 1000, 'Admission date cannot be in the future')
    .optional(),
  notes: z.string().trim().max(500).optional(),
};

// POST /api/doctors/:id/patients - the doctor comes from the URL
export const createDoctorPatientSchema = z.object(patientFields);

// POST /api/patients
export const createPatientSchema = createDoctorPatientSchema.extend({ doctor: objectId });

export const updatePatientSchema = z
  .object({ ...patientFields, status: z.enum(STATUSES), doctor: objectId })
  .partial()
  .refine((body) => Object.keys(body).length > 0, { message: 'Provide at least one field to update' });

const patientFilters = z.object({
  condition: z.enum(CONDITIONS).optional(),
  status: z.enum(STATUSES).optional(),
});

export const PATIENT_SORTS = ['-admissionDate', 'admissionDate', 'name', '-name', 'age', '-age'] as const;

export const listPatientsQuery = patientFilters
  .extend({
    gender: z.enum(GENDERS).optional(),
    doctor: objectId.optional(),
    sort: z.enum(PATIENT_SORTS).default('-admissionDate'),
  })
  .and(searchQuery)
  .and(paginationQuery)
  .and(dateRangeQuery);

export const listDoctorPatientsQuery = patientFilters
  .extend({ sort: z.enum(PATIENT_SORTS).default('-admissionDate') })
  .and(searchQuery)
  .and(paginationQuery)
  .and(dateRangeQuery);

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type CreateDoctorPatientInput = z.infer<typeof createDoctorPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type ListPatientsQuery = z.infer<typeof listPatientsQuery>;
export type ListDoctorPatientsQuery = z.infer<typeof listDoctorPatientsQuery>;
