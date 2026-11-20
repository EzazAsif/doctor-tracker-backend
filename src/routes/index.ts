import { Router } from 'express';
import { requireAuth, requireDoctorLink, requireRole } from '../middleware/auth';
import authRoutes from './auth.routes';
import doctorRoutes from './doctor.routes';
import patientRoutes from './patient.routes';
import dashboardRoutes from './dashboard.routes';
import activityRoutes from './activity.routes';
import staffRoutes from './staff.routes';

const router = Router();

router.use('/auth', authRoutes);

// rest needs login + admin role (authorization, not just authentication)
const adminOnly = [requireAuth, requireRole('admin')];
router.use('/doctors', ...adminOnly, doctorRoutes);
router.use('/patients', requireAuth, requireRole('admin', 'doctor'), requireDoctorLink, patientRoutes);
router.use('/dashboard', ...adminOnly, dashboardRoutes);
router.use('/activity', ...adminOnly, activityRoutes);
router.use('/users', ...adminOnly, staffRoutes);

export default router;
