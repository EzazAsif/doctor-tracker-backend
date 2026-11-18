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

const router = Router();

// static paths first so "/options" isn't treated as an :id
router.get('/', validate({ query: listDoctorsQuery }), asyncHandler(doctors.list));
router.get('/options', asyncHandler(doctors.options));
router.get('/lookup', validate({ query: lookupDoctorsQuery }), asyncHandler(doctors.lookup));
router.post('/', validate({ body: createDoctorSchema }), asyncHandler(doctors.create));

router.get('/:id', validateObjectId('id'), asyncHandler(doctors.getOne));
router.patch('/:id', validateObjectId('id'), validate({ body: updateDoctorSchema }), asyncHandler(doctors.update));

export default router;
