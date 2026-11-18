import type { QueryFilter } from 'mongoose';
import { DoctorModel } from '../models/Doctor';
import { PatientModel, type Patient } from '../models/Patient';
import { ApiError } from '../utils/ApiError';
import { dateRangeFilter, pageMeta, paginate, parseSort, searchFilter } from '../utils/query';
import type {
  CreateDoctorPatientInput,
  CreatePatientInput,
  ListPatientsQuery,
  UpdatePatientInput,
} from '../validators/patient.validator';

const PATIENT_FIELDS =
  'name age gender phone email condition status admissionDate notes doctor createdAt updatedAt';
const DOCTOR_SUMMARY = { path: 'doctor', select: 'name specialization' };
const SEARCH_FIELDS = ['name', 'phone', 'email'];

export async function listPatients(q: ListPatientsQuery) {
  const filter: QueryFilter<Patient> = {
    ...searchFilter(q.search, SEARCH_FIELDS),
    ...(q.doctor && { doctor: q.doctor }),
    ...(q.condition && { condition: q.condition }),
    ...(q.status && { status: q.status }),
    ...(q.gender && { gender: q.gender }),
    ...dateRangeFilter('admissionDate', q.from, q.to),
  };
  const { skip, limit } = paginate(q.page, q.limit);

  const [data, total] = await Promise.all([
    PatientModel.find(filter)
      .select(PATIENT_FIELDS)
      .sort(parseSort(q.sort))
      .skip(skip)
      .limit(limit)
      // one extra query with $in over just this page's doctor ids
      .populate(DOCTOR_SUMMARY)
      .lean(),
    PatientModel.countDocuments(filter),
  ]);

  return { data, meta: pageMeta(q.page, q.limit, total) };
}

export async function getPatient(id: string) {
  const patient = await PatientModel.findById(id).select(PATIENT_FIELDS).populate(DOCTOR_SUMMARY).lean();
  if (!patient) throw ApiError.notFound('Patient not found');
  return patient;
}

function bumpPatientCount(doctorId: unknown, by: 1 | -1) {
  return DoctorModel.updateOne({ _id: doctorId }, { $inc: { patientCount: by } });
}

const doctorNotFound = (fromUrl: boolean) =>
  fromUrl
    ? ApiError.notFound('Doctor not found')
    : ApiError.badRequest('Invalid input', [{ path: 'doctor', message: 'Doctor not found' }]);

// doctorFromUrl: 404 when doctor is the url resource, 400 when its a body field
export async function createPatient(input: CreatePatientInput, { doctorFromUrl = false } = {}) {
  const { email, ...rest } = input;

  if (!(await DoctorModel.exists({ _id: input.doctor }))) throw doctorNotFound(doctorFromUrl);

  // insert first, only count it once its actually saved
  const patient = await PatientModel.create({ ...rest, ...(email ? { email } : {}) });
  await bumpPatientCount(input.doctor, 1);

  return getPatient(String(patient._id));
}

export function createPatientForDoctor(doctorId: string, input: CreateDoctorPatientInput) {
  return createPatient({ ...input, doctor: doctorId }, { doctorFromUrl: true });
}

export async function updatePatient(id: string, input: UpdatePatientInput) {
  const { email, ...rest } = input;
  const $set: Record<string, unknown> = { ...rest, ...(email ? { email } : {}) };
  const update: Record<string, unknown> = {};
  if (Object.keys($set).length) update.$set = $set;
  if (email === '') update.$unset = { email: 1 };

  if (input.doctor && !(await DoctorModel.exists({ _id: input.doctor }))) throw doctorNotFound(false);

  // returns the old doc so we know which doctor it was under before
  const before = await PatientModel.findByIdAndUpdate(id, update, {
    returnDocument: 'before',
    runValidators: true,
    projection: { doctor: 1 },
  }).lean();
  if (!before) throw ApiError.notFound('Patient not found');

  if (input.doctor && String(before.doctor) !== input.doctor) {
    await Promise.all([bumpPatientCount(before.doctor, -1), bumpPatientCount(input.doctor, 1)]);
  }

  return getPatient(id);
}

// with doctorId it only deletes if the patient is under that doctor
export async function deletePatient(id: string, doctorId?: string) {
  const filter = doctorId ? { _id: id, doctor: doctorId } : { _id: id };
  const deleted = await PatientModel.findOneAndDelete(filter, { projection: { doctor: 1 } }).lean();
  if (!deleted) throw ApiError.notFound(doctorId ? 'Patient not found for this doctor' : 'Patient not found');

  await bumpPatientCount(deleted.doctor, -1);
  return { deleted: true };
}
