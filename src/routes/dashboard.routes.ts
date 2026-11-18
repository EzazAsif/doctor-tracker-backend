import { Router } from 'express';
import * as dashboard from '../controllers/dashboard.controller';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { dateRangeQuery } from '../validators/common';

const router = Router();

router.get('/stats', validate({ query: dateRangeQuery }), asyncHandler(dashboard.stats));

export default router;
