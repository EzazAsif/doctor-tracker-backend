import { Schema, model, type InferSchemaType } from 'mongoose';

export const GENDERS = ['male', 'female', 'other'] as const;
export const CONDITIONS = [
  'Hypertension',
  'Diabetes',
  'Asthma',
  'Cardiac',
  'Orthopedic',
  'Respiratory',
  'Neurological',
  'Dermatology',
  'Pediatric',
  'General',
] as const;
export const STATUSES = ['admitted', 'under_treatment', 'recovered', 'discharged'] as const;

const patientSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    age: { type: Number, required: true, min: 0, max: 120 },
    gender: { type: String, required: true, enum: GENDERS },
    phone: { type: String, required: true, trim: true, minlength: 7, maxlength: 20 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254 },
    condition: { type: String, required: true, enum: CONDITIONS },
    status: { type: String, enum: STATUSES, default: 'admitted' },
    admissionDate: { type: Date, required: true, default: Date.now },
    notes: { type: String, trim: true, maxlength: 500 },
    doctor: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
  },
  { timestamps: true, toJSON: { versionKey: false } },
);

// a doctor's patient list, newest admission first (also used by $inc / cascade delete)
patientSchema.index({ doctor: 1, admissionDate: -1 });
// condition filter + default sort
patientSchema.index({ condition: 1, admissionDate: -1 });
patientSchema.index({ status: 1 });
// default sort, date range filter and the dashboard's monthly grouping
patientSchema.index({ admissionDate: -1 });
patientSchema.index({ name: 1 });

export type Patient = InferSchemaType<typeof patientSchema>;
export const PatientModel = model('Patient', patientSchema);
