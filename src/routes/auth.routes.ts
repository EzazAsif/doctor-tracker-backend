import { Router } from 'express';
import * as auth from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { loginSchema } from '../validators/auth.validator';

const router = Router();

router.post('/login', validate({ body: loginSchema }), asyncHandler(auth.login));
router.post('/logout', requireAuth, asyncHandler(auth.logout));
router.get('/me', requireAuth, asyncHandler(auth.me));

export default router;
