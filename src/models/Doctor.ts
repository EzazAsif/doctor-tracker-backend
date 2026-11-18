import { Schema, model, type InferSchemaType } from 'mongoose';

const doctorSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    specialization: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    hospital: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    phone: { type: String, required: true, trim: true, minlength: 7, maxlength: 20 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    // denormalized: kept in sync by the patient service, never written by clients
    patientCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, toJSON: { versionKey: false } },
);

doctorSchema.index({ email: 1 }, { unique: true });
// default list order, and the createdAt range filter
doctorSchema.index({ createdAt: -1 });
// "filter by specialization, newest first" - equality field first, then sort field
doctorSchema.index({ specialization: 1, createdAt: -1 });
doctorSchema.index({ hospital: 1 });
// "most patients" sort
doctorSchema.index({ patientCount: -1 });
// alphabetical sort + doctor picker
doctorSchema.index({ name: 1 });

export type Doctor = InferSchemaType<typeof doctorSchema>;
export const DoctorModel = model('Doctor', doctorSchema);
