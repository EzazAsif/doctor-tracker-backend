import { Router } from 'express';
import * as patients from '../controllers/patient.controller';
import { validate, validateObjectId } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { createPatientSchema, listPatientsQuery, updatePatientSchema } from '../validators/patient.validator';
import { importRowsSchema } from '../validators/common';

const router = Router();

router.get('/', validate({ query: listPatientsQuery }), asyncHandler(patients.list));
router.post('/', validate({ body: createPatientSchema }), asyncHandler(patients.create));
router.post('/import', validate({ body: importRowsSchema }), asyncHandler(patients.importMany));

router.get('/:id', validateObjectId('id'), asyncHandler(patients.getOne));
router.patch('/:id', validateObjectId('id'), validate({ body: updatePatientSchema }), asyncHandler(patients.update));
router.delete('/:id', validateObjectId('id'), asyncHandler(patients.remove));

export default router;
