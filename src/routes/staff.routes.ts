import { Router } from 'express';
import * as staff from '../controllers/staff.controller';
import { validate, validateObjectId } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { createStaffSchema, updateStaffSchema } from '../validators/staff.validator';

const router = Router();
router.get('/', asyncHandler(staff.list));
router.post('/', validate({ body: createStaffSchema }), asyncHandler(staff.create));
router.patch('/:id', validateObjectId('id'), validate({ body: updateStaffSchema }), asyncHandler(staff.setActive));
export default router;
