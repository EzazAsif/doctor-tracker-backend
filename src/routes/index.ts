import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import authRoutes from './auth.routes';
import doctorRoutes from './doctor.routes';

const router = Router();

router.use('/auth', authRoutes);

// everything below needs a logged-in admin
router.use('/doctors', requireAuth, doctorRoutes);

export default router;
