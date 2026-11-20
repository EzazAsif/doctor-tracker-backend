import { DoctorModel } from '../models/Doctor';
import { PatientModel } from '../models/Patient';
import { ApiError } from '../utils/ApiError';
import { dateRangeFilter, pageMeta, paginate, parseSort, searchFilter } from '../utils/query';
import { createDoctorSchema, type CreateDoctorInput, type ListDoctorsQuery, type UpdateDoctorInput } from '../validators/doctor.validator';
import { importErrorMessage } from './import-error';

const DOCTOR_FIELDS = 'name specialization hospital phone email patientCount createdAt updatedAt';
const SEARCH_FIELDS = ['name', 'specialization', 'hospital', 'email'];

export async function listDoctors(q: ListDoctorsQuery) {
  const filter = {
    ...searchFilter(q.search, SEARCH_FIELDS),
    ...(q.specialization && { specialization: q.specialization }),
    ...(q.hospital && { hospital: q.hospital }),
    ...dateRangeFilter('createdAt', q.from, q.to),
  };
  const { skip, limit } = paginate(q.page, q.limit);

  // page and count in parallel
  const [data, total] = await Promise.all([
    DoctorModel.find(filter).select(DOCTOR_FIELDS).sort(parseSort(q.sort)).skip(skip).limit(limit).lean(),
    DoctorModel.countDocuments(filter),
  ]);

  return { data, meta: pageMeta(q.page, q.limit, total) };
}

export async function getFilterOptions() {
  const [specializations, hospitals] = await Promise.all([
    DoctorModel.distinct('specialization'),
    DoctorModel.distinct('hospital'),
  ]);
  const sort = (a: string[]) => a.sort((x, y) => x.localeCompare(y));
  return { specializations: sort(specializations), hospitals: sort(hospitals) };
}

export async function lookupDoctors(search?: string) {
  return DoctorModel.find(searchFilter(search, ['name', 'specialization']))
    .select('name specialization')
    .sort({ name: 1 })
    .limit(20)
    .lean();
}

export async function getDoctor(id: string) {
  const doctor = await DoctorModel.findById(id).select(DOCTOR_FIELDS).lean();
  if (!doctor) throw ApiError.notFound('Doctor not found');
  return doctor;
}

export async function assertDoctorExists(id: string) {
  const exists = await DoctorModel.exists({ _id: id });
  if (!exists) throw ApiError.notFound('Doctor not found');
}

export async function createDoctor(input: CreateDoctorInput) {
  const doctor = await DoctorModel.create(input);
  return doctor.toJSON();
}

export async function importDoctors(rows: unknown[]) {
  let imported = 0;
  const errors: { row: number; message: string }[] = [];

  for (const [index, row] of rows.entries()) {
    const parsed = createDoctorSchema.safeParse(row);
    if (!parsed.success) {
      errors.push({ row: index + 2, message: parsed.error.issues.map((issue) => issue.message).join('; ') });
      continue;
    }

    try {
      await DoctorModel.create(parsed.data);
      imported += 1;
    } catch (error) {
      const message = importErrorMessage(error);
      if (!message) throw error;
      errors.push({ row: index + 2, message });
    }
  }

  return { total: rows.length, imported, errors };
}

export async function updateDoctor(id: string, input: UpdateDoctorInput) {
  const doctor = await DoctorModel.findByIdAndUpdate(id, input, { returnDocument: 'after', runValidators: true })
    .select(DOCTOR_FIELDS)
    .lean();
  if (!doctor) throw ApiError.notFound('Doctor not found');
  return doctor;
}

// patients first, so if it dies halfway the doctor is still there and you can retry
export async function deleteDoctor(doctorId: string) {
  await assertDoctorExists(doctorId);
  const { deletedCount } = await PatientModel.deleteMany({ doctor: doctorId });
  await DoctorModel.deleteOne({ _id: doctorId });
  return { deleted: true, patientsDeleted: deletedCount };
}

// rebuild patientCount from scratch (seed + npm run recount)
export async function recountPatientCounts() {
  const counts = await PatientModel.aggregate<{ _id: unknown; n: number }>([
    { $group: { _id: '$doctor', n: { $sum: 1 } } },
  ]);

  const { modifiedCount } = await DoctorModel.bulkWrite([
    // doctors with no patients wont show up in the $group
    { updateMany: { filter: { _id: { $nin: counts.map((c) => c._id) } }, update: { $set: { patientCount: 0 } } } },
    ...counts.map((c) => ({
      updateOne: { filter: { _id: c._id }, update: { $set: { patientCount: c.n } } },
    })),
  ], { timestamps: false });

  return { doctorsWithPatients: counts.length, updated: modifiedCount };
}
