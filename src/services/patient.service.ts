import type { ClientSession, QueryFilter } from 'mongoose';
import { DoctorModel } from '../models/Doctor';
import { PatientModel, type Patient } from '../models/Patient';
import { ApiError } from '../utils/ApiError';
import { dateRangeFilter, pageMeta, paginate, parseSort, searchFilter } from '../utils/query';
import { withTransaction } from '../utils/transaction';
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

async function bumpPatientCount(doctorId: unknown, by: 1 | -1, session: ClientSession) {
  await DoctorModel.updateOne({ _id: doctorId }, { $inc: { patientCount: by } }, { session });
}

/**
 * Creates the patient and bumps the doctor's patientCount in one transaction,
 * so the denormalized counter can't drift if either write fails.
 * `doctorFromUrl` decides whether a missing doctor is a 404 (it's the resource
 * in the path) or a 400 (it's a bad field in the body).
 */
export async function createPatient(input: CreatePatientInput, { doctorFromUrl = false } = {}) {
  const { email, ...rest } = input;
  const doc = { ...rest, ...(email ? { email } : {}) };

  const id = await withTransaction(async (session) => {
    const doctorExists = await DoctorModel.exists({ _id: input.doctor }).session(session);
    if (!doctorExists) {
      throw doctorFromUrl
        ? ApiError.notFound('Doctor not found')
        : ApiError.badRequest('Invalid input', [{ path: 'doctor', message: 'Doctor not found' }]);
    }

    const [patient] = await PatientModel.create([doc], { session });
    await bumpPatientCount(input.doctor, 1, session);
    return patient._id;
  });

  return getPatient(String(id));
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

  await withTransaction(async (session) => {
    const current = await PatientModel.findById(id).select('doctor').session(session).lean();
    if (!current) throw ApiError.notFound('Patient not found');

    const movingDoctor = input.doctor && String(current.doctor) !== input.doctor;
    if (movingDoctor) {
      const exists = await DoctorModel.exists({ _id: input.doctor }).session(session);
      if (!exists) throw ApiError.badRequest('Invalid input', [{ path: 'doctor', message: 'Doctor not found' }]);
    }

    await PatientModel.updateOne({ _id: id }, update, { session, runValidators: true });

    if (movingDoctor) {
      await bumpPatientCount(current.doctor, -1, session);
      await bumpPatientCount(input.doctor, 1, session);
    }
  });

  return getPatient(id);
}

/** Deletes a patient. With `doctorId`, only if the patient belongs to that doctor. */
export async function deletePatient(id: string, doctorId?: string) {
  await withTransaction(async (session) => {
    const filter = doctorId ? { _id: id, doctor: doctorId } : { _id: id };
    const deleted = await PatientModel.findOneAndDelete(filter, { session, projection: { doctor: 1 } }).lean();
    if (!deleted) {
      throw ApiError.notFound(doctorId ? 'Patient not found for this doctor' : 'Patient not found');
    }
    await bumpPatientCount(deleted.doctor, -1, session);
  });
  return { deleted: true };
}

