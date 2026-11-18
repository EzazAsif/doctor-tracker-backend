import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import authRoutes from './auth.routes';
import doctorRoutes from './doctor.routes';
import patientRoutes from './patient.routes';
import dashboardRoutes from './dashboard.routes';

const router = Router();

router.use('/auth', authRoutes);

// rest needs login + admin role (authorization, not just authentication)
const adminOnly = [requireAuth, requireRole('admin')];
router.use('/doctors', ...adminOnly, doctorRoutes);
router.use('/patients', ...adminOnly, patientRoutes);
router.use('/dashboard', ...adminOnly, dashboardRoutes);

export default router;
