import { Router } from 'express';
import * as activity from '../controllers/activity.controller';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { listActivityQuery } from '../validators/staff.validator';

const router = Router();
router.get('/', validate({ query: listActivityQuery }), asyncHandler(activity.list));
export default router;
