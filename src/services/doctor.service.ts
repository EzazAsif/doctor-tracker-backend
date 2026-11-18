import { DoctorModel } from '../models/Doctor';
import { PatientModel } from '../models/Patient';
import { ApiError } from '../utils/ApiError';
import { dateRangeFilter, pageMeta, paginate, parseSort, searchFilter } from '../utils/query';
import type { CreateDoctorInput, ListDoctorsQuery, UpdateDoctorInput } from '../validators/doctor.validator';

// fields returned in list/detail responses - keeps payloads small and predictable
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

  // page + total in parallel: one round trip's worth of latency instead of two
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

export async function updateDoctor(id: string, input: UpdateDoctorInput) {
  const doctor = await DoctorModel.findByIdAndUpdate(id, input, { returnDocument: 'after', runValidators: true })
    .select(DOCTOR_FIELDS)
    .lean();
  if (!doctor) throw ApiError.notFound('Doctor not found');
  return doctor;
}

// patients first, then the doctor. if it fails halfway the doctor is still there and delete can be retried
export async function deleteDoctor(doctorId: string) {
  await assertDoctorExists(doctorId);
  const { deletedCount } = await PatientModel.deleteMany({ doctor: doctorId });
  await DoctorModel.deleteOne({ _id: doctorId });
  return { deleted: true, patientsDeleted: deletedCount };
}
