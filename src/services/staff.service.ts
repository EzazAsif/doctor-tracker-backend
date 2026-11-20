import bcrypt from 'bcryptjs';
import { DoctorModel } from '../models/Doctor';
import { UserModel } from '../models/User';
import { ApiError } from '../utils/ApiError';
import type { AuthUser } from '../types/express';
import type { CreateStaffInput } from '../validators/staff.validator';
import { toPublicUser } from './auth.service';

export async function listStaff() {
  const staff = await UserModel.find()
    .select('name email role doctor active createdAt')
    .populate({ path: 'doctor', select: 'name specialization email' })
    .sort({ createdAt: -1 })
    .lean();
  return staff.map((member) => ({ ...member, active: member.active !== false }));
}

export async function createStaff(input: CreateStaffInput) {
  let doctorId;
  if (input.role === 'doctor') {
    const doctor = await DoctorModel.findOne({ email: input.email }).select('_id').lean();
    if (!doctor) {
      throw ApiError.badRequest('Doctor accounts must use an existing doctor email', [
        { path: 'email', message: 'No doctor record uses this email' },
      ]);
    }
    if (await UserModel.exists({ doctor: doctor._id })) {
      throw ApiError.conflict('This doctor already has an account', [
        { path: 'email', message: 'An account already exists for this doctor' },
      ]);
    }
    doctorId = doctor._id;
  }

  const user = await UserModel.create({
    name: input.name,
    email: input.email,
    password: await bcrypt.hash(input.password, 12),
    role: input.role,
    ...(doctorId ? { doctor: doctorId } : {}),
  });
  return toPublicUser(user);
}

export async function setStaffActive(id: string, active: boolean, actor: AuthUser) {
  const user = await UserModel.findById(id);
  if (!user) throw ApiError.notFound('Staff account not found');
  if (!active && user.role === 'admin' && (await UserModel.countDocuments({ role: 'admin', active: { $ne: false } })) <= 1) {
    throw ApiError.badRequest('Keep at least one active admin account');
  }
  if (!active && String(user._id) === String(actor._id)) {
    throw ApiError.badRequest('You cannot deactivate your own account');
  }
  user.active = active;
  await user.save();
  return toPublicUser(user);
}
