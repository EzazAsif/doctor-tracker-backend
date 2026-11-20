import type { Request, Response } from 'express';
import * as patientService from '../services/patient.service';
import type { CreatePatientInput, ListPatientsQuery, UpdatePatientInput } from '../validators/patient.validator';
import * as activityService from '../services/activity.service';

type IdParams = { id: string };

export async function list(req: Request, res: Response) {
  const assignedDoctor = req.user?.role === 'doctor' ? String(req.user.doctor) : undefined;
  res.json(await patientService.listPatients(req.query as unknown as ListPatientsQuery, assignedDoctor));
}

export async function getOne(req: Request<IdParams>, res: Response) {
  const assignedDoctor = req.user?.role === 'doctor' ? String(req.user.doctor) : undefined;
  res.json({ data: await patientService.getPatient(req.params.id, assignedDoctor) });
}

export async function create(req: Request, res: Response) {
  const patient = req.user?.role === 'doctor'
    ? await patientService.createPatientForDoctor(String(req.user.doctor), req.body)
    : await patientService.createPatient(req.body as CreatePatientInput);
  await activityService.recordActivity({ actor: req.user!, action: 'created', resource: 'patient', resourceId: String(patient._id), fields: Object.keys(req.body) });
  res.status(201).json({ data: patient });
}

export async function importMany(req: Request, res: Response) {
  const assignedDoctor = req.user?.role === 'doctor' ? String(req.user.doctor) : undefined;
  const result = await patientService.importPatients((req.body as { rows: unknown[] }).rows, assignedDoctor);
  await activityService.recordActivity({
    actor: req.user!, action: 'imported', resource: 'patient', resourceId: assignedDoctor ?? 'bulk',
    importedCount: result.imported, failedCount: result.errors.length,
  });
  res.json({ data: result });
}

export async function update(req: Request<IdParams>, res: Response) {
  const assignedDoctor = req.user?.role === 'doctor' ? String(req.user.doctor) : undefined;
  const patient = await patientService.updatePatient(req.params.id, req.body as UpdatePatientInput, assignedDoctor);
  await activityService.recordActivity({ actor: req.user!, action: 'updated', resource: 'patient', resourceId: req.params.id, fields: Object.keys(req.body) });
  res.json({ data: patient });
}

export async function remove(req: Request<IdParams>, res: Response) {
  const assignedDoctor = req.user?.role === 'doctor' ? String(req.user.doctor) : undefined;
  const result = await patientService.deletePatient(req.params.id, assignedDoctor);
  await activityService.recordActivity({ actor: req.user!, action: 'deleted', resource: 'patient', resourceId: req.params.id });
  res.json({ data: result });
}
