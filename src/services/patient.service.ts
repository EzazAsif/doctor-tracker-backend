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
import { createDoctorPatientSchema, importPatientSchema } from '../validators/patient.validator';
import { importErrorMessage } from './import-error';

const PATIENT_FIELDS =
  'name age gender phone email condition status admissionDate notes doctor createdAt updatedAt';
const DOCTOR_SUMMARY = { path: 'doctor', select: 'name specialization' };
const SEARCH_FIELDS = ['name', 'phone', 'email'];

export async function listPatients(q: ListPatientsQuery, assignedDoctor?: string) {
  const filter: QueryFilter<Patient> = {
    ...searchFilter(q.search, SEARCH_FIELDS),
    ...(assignedDoctor ? { doctor: assignedDoctor } : q.doctor && { doctor: q.doctor }),
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
      .populate(DOCTOR_SUMMARY)
      .lean(),
    PatientModel.countDocuments(filter),
  ]);

  return { data, meta: pageMeta(q.page, q.limit, total) };
}

export async function getPatient(id: string, assignedDoctor?: string) {
  const patient = await PatientModel.findOne({ _id: id, ...(assignedDoctor ? { doctor: assignedDoctor } : {}) })
    .select(PATIENT_FIELDS)
    .populate(DOCTOR_SUMMARY)
    .lean();
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

// doctorFromUrl -> 404, doctor in body -> 400
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

export async function importPatients(rows: unknown[], assignedDoctor?: string) {
  let imported = 0;
  const errors: { row: number; message: string }[] = [];

  for (const [index, row] of rows.entries()) {
    const parsed = (assignedDoctor ? createDoctorPatientSchema : importPatientSchema).safeParse(row);
    if (!parsed.success) {
      errors.push({ row: index + 2, message: parsed.error.issues.map((issue) => issue.message).join('; ') });
      continue;
    }

    let input: CreatePatientInput;
    if (assignedDoctor) {
      input = { ...(parsed.data as CreateDoctorPatientInput), doctor: assignedDoctor };
    } else {
      const { doctorEmail, ...patient } = parsed.data as ReturnType<typeof importPatientSchema.parse>;
      const doctor = await DoctorModel.findOne({ email: doctorEmail }).select('_id').lean();
      if (!doctor) {
        errors.push({ row: index + 2, message: `No doctor found for ${doctorEmail}` });
        continue;
      }
      input = { ...patient, doctor: String(doctor._id) };
    }

    try {
      await createPatient(input);
      imported += 1;
    } catch (error) {
      const message = importErrorMessage(error);
      if (!message) throw error;
      errors.push({ row: index + 2, message });
    }
  }

  return { total: rows.length, imported, errors };
}

export async function updatePatient(id: string, input: UpdatePatientInput, assignedDoctor?: string) {
  if (assignedDoctor && input.doctor && input.doctor !== assignedDoctor) {
    throw ApiError.badRequest('Doctors can only update their own patient records', [
      { path: 'doctor', message: 'You cannot reassign this patient' },
    ]);
  }
  const { email, ...rest } = input;
  const $set: Record<string, unknown> = { ...rest, ...(email ? { email } : {}) };
  const update: Record<string, unknown> = {};
  if (Object.keys($set).length) update.$set = $set;
  if (email === '') update.$unset = { email: 1 };

  if (input.doctor && !(await DoctorModel.exists({ _id: input.doctor }))) throw doctorNotFound(false);

  // old doc, need the previous doctor
  const before = await PatientModel.findOneAndUpdate({ _id: id, ...(assignedDoctor ? { doctor: assignedDoctor } : {}) }, update, {
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

export async function deletePatient(id: string, assignedDoctor?: string) {
  const filter = assignedDoctor ? { _id: id, doctor: assignedDoctor } : { _id: id };
  const deleted = await PatientModel.findOneAndDelete(filter, { projection: { doctor: 1 } }).lean();
  if (!deleted) throw ApiError.notFound(assignedDoctor ? 'Patient not found for this doctor' : 'Patient not found');

  await bumpPatientCount(deleted.doctor, -1);
  return { deleted: true };
}
