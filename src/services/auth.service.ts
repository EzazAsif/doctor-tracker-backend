import bcrypt from 'bcryptjs';
import { UserModel } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { signToken, verifyToken } from '../utils/jwt';
import type { AuthUser } from '../types/express';

// used when email doesnt exist so timing is the same
const DUMMY_HASH = '$2b$10$SUYfb7fU.r7SXzPCWBTWRuB4iA18pDUg3PUokBF/1OAE8B.NdQVa6';

export async function login(email: string, password: string) {
  const user = await UserModel.findOne({ email }).select('+password');
  const ok = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);

  if (!user || !ok) throw ApiError.unauthorized('Invalid email or password');

  const token = signToken({ sub: user.id, role: user.role });
  const { exp } = verifyToken(token);

  return { user: toPublicUser(user), token, expiresAt: new Date(exp * 1000) };
}

export async function findUserById(id: string): Promise<AuthUser | null> {
  return UserModel.findById(id).select('name email role').lean<AuthUser>();
}

export function toPublicUser(u: { _id: unknown; name: string; email: string; role: string }) {
  return { _id: u._id, name: u.name, email: u.email, role: u.role };
}
