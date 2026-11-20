import type { Request, Response } from 'express';
import * as doctorService from '../services/doctor.service';
import * as patientService from '../services/patient.service';
import type { CreateDoctorInput, ListDoctorsQuery, UpdateDoctorInput } from '../validators/doctor.validator';
import type { CreateDoctorPatientInput, ListDoctorPatientsQuery } from '../validators/patient.validator';
import * as activityService from '../services/activity.service';

type IdParams = { id: string };

export async function list(req: Request, res: Response) {
  res.json(await doctorService.listDoctors(req.query as unknown as ListDoctorsQuery));
}

export async function options(_req: Request, res: Response) {
  res.json({ data: await doctorService.getFilterOptions() });
}

export async function lookup(req: Request, res: Response) {
  const { search } = req.query as { search?: string };
  res.json({ data: await doctorService.lookupDoctors(search) });
}

export async function getOne(req: Request<IdParams>, res: Response) {
  res.json({ data: await doctorService.getDoctor(req.params.id) });
}

export async function create(req: Request, res: Response) {
  const doctor = await doctorService.createDoctor(req.body as CreateDoctorInput);
  await activityService.recordActivity({ actor: req.user!, action: 'created', resource: 'doctor', resourceId: String(doctor._id), fields: Object.keys(req.body) });
  res.status(201).json({ data: doctor });
}

export async function importMany(req: Request, res: Response) {
  const result = await doctorService.importDoctors((req.body as { rows: unknown[] }).rows);
  await activityService.recordActivity({ actor: req.user!, action: 'imported', resource: 'doctor', resourceId: 'bulk', importedCount: result.imported, failedCount: result.errors.length });
  res.json({ data: result });
}

export async function update(req: Request<IdParams>, res: Response) {
  const doctor = await doctorService.updateDoctor(req.params.id, req.body as UpdateDoctorInput);
  await activityService.recordActivity({ actor: req.user!, action: 'updated', resource: 'doctor', resourceId: req.params.id, fields: Object.keys(req.body) });
  res.json({ data: doctor });
}

export async function remove(req: Request<IdParams>, res: Response) {
  const result = await doctorService.deleteDoctor(req.params.id);
  await activityService.recordActivity({ actor: req.user!, action: 'deleted', resource: 'doctor', resourceId: req.params.id, relatedCount: result.patientsDeleted });
  res.json({ data: result });
}

// patients under a doctor

export async function listPatients(req: Request<IdParams>, res: Response) {
  await doctorService.assertDoctorExists(req.params.id);
  const query = req.query as unknown as ListDoctorPatientsQuery;
  res.json(await patientService.listPatients({ ...query, doctor: req.params.id }));
}

export async function addPatient(req: Request<IdParams>, res: Response) {
  const patient = await patientService.createPatientForDoctor(req.params.id, req.body as CreateDoctorPatientInput);
  await activityService.recordActivity({ actor: req.user!, action: 'created', resource: 'patient', resourceId: String(patient._id), fields: Object.keys(req.body) });
  res.status(201).json({ data: patient });
}

export async function removePatient(req: Request<IdParams & { patientId: string }>, res: Response) {
  const result = await patientService.deletePatient(req.params.patientId, req.params.id);
  await activityService.recordActivity({ actor: req.user!, action: 'deleted', resource: 'patient', resourceId: req.params.patientId });
  res.json({ data: result });
}
