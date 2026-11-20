import type { Request, Response } from 'express';
import * as patientService from '../services/patient.service';
import type { CreatePatientInput, ListPatientsQuery, UpdatePatientInput } from '../validators/patient.validator';

type IdParams = { id: string };

export async function list(req: Request, res: Response) {
  res.json(await patientService.listPatients(req.query as unknown as ListPatientsQuery));
}

export async function getOne(req: Request<IdParams>, res: Response) {
  res.json({ data: await patientService.getPatient(req.params.id) });
}

export async function create(req: Request, res: Response) {
  const patient = await patientService.createPatient(req.body as CreatePatientInput);
  res.status(201).json({ data: patient });
}

export async function importMany(req: Request, res: Response) {
  res.json({ data: await patientService.importPatients((req.body as { rows: unknown[] }).rows) });
}

export async function update(req: Request<IdParams>, res: Response) {
  res.json({ data: await patientService.updatePatient(req.params.id, req.body as UpdatePatientInput) });
}

export async function remove(req: Request<IdParams>, res: Response) {
  res.json({ data: await patientService.deletePatient(req.params.id) });
}
