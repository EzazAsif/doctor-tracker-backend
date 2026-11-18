import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import authRoutes from './auth.routes';
import doctorRoutes from './doctor.routes';
import patientRoutes from './patient.routes';
import dashboardRoutes from './dashboard.routes';

const router = Router();

router.use('/auth', authRoutes);

// everything below needs a logged-in admin
router.use('/doctors', requireAuth, doctorRoutes);
router.use('/patients', requireAuth, patientRoutes);
router.use('/dashboard', requireAuth, dashboardRoutes);

export default router;
