import { Router } from 'express';
import * as doctors from '../controllers/doctor.controller';
import { validate, validateObjectId } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import {
  createDoctorSchema,
  listDoctorsQuery,
  lookupDoctorsQuery,
  updateDoctorSchema,
} from '../validators/doctor.validator';
import { createDoctorPatientSchema, listDoctorPatientsQuery } from '../validators/patient.validator';

const router = Router();

// keep these above /:id
router.get('/', validate({ query: listDoctorsQuery }), asyncHandler(doctors.list));
router.get('/options', asyncHandler(doctors.options));
router.get('/lookup', validate({ query: lookupDoctorsQuery }), asyncHandler(doctors.lookup));
router.post('/', validate({ body: createDoctorSchema }), asyncHandler(doctors.create));

router.get('/:id', validateObjectId('id'), asyncHandler(doctors.getOne));
router.patch('/:id', validateObjectId('id'), validate({ body: updateDoctorSchema }), asyncHandler(doctors.update));
router.delete('/:id', validateObjectId('id'), asyncHandler(doctors.remove));

router.get(
  '/:id/patients',
  validateObjectId('id'),
  validate({ query: listDoctorPatientsQuery }),
  asyncHandler(doctors.listPatients),
);
router.post(
  '/:id/patients',
  validateObjectId('id'),
  validate({ body: createDoctorPatientSchema }),
  asyncHandler(doctors.addPatient),
);
router.delete('/:id/patients/:patientId', validateObjectId('id', 'patientId'), asyncHandler(doctors.removePatient));

export default router;
