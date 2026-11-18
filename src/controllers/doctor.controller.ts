import type { Request, Response } from 'express';
import * as doctorService from '../services/doctor.service';
import * as patientService from '../services/patient.service';
import type { CreateDoctorInput, ListDoctorsQuery, UpdateDoctorInput } from '../validators/doctor.validator';
import type { CreateDoctorPatientInput, ListDoctorPatientsQuery } from '../validators/patient.validator';

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
  res.status(201).json({ data: doctor });
}

export async function update(req: Request<IdParams>, res: Response) {
  res.json({ data: await doctorService.updateDoctor(req.params.id, req.body as UpdateDoctorInput) });
}

export async function remove(req: Request<IdParams>, res: Response) {
  res.json({ data: await doctorService.deleteDoctor(req.params.id) });
}

// patients under a doctor

export async function listPatients(req: Request<IdParams>, res: Response) {
  await doctorService.assertDoctorExists(req.params.id);
  const query = req.query as unknown as ListDoctorPatientsQuery;
  res.json(await patientService.listPatients({ ...query, doctor: req.params.id }));
}

export async function addPatient(req: Request<IdParams>, res: Response) {
  const patient = await patientService.createPatientForDoctor(req.params.id, req.body as CreateDoctorPatientInput);
  res.status(201).json({ data: patient });
}

export async function removePatient(req: Request<IdParams & { patientId: string }>, res: Response) {
  res.json({ data: await patientService.deletePatient(req.params.patientId, req.params.id) });
}
