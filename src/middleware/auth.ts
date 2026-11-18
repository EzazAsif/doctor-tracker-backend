import type { RequestHandler } from 'express';
import { ApiError } from '../utils/ApiError';
import { verifyToken } from '../utils/jwt';
import { findUserById } from '../services/auth.service';

function readToken(cookieToken: unknown, header: string | undefined): string | null {
  if (typeof cookieToken === 'string' && cookieToken) return cookieToken;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim() || null;
  return null;
}

/** Accepts the httpOnly `token` cookie, or `Authorization: Bearer <jwt>` for API clients. */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = readToken(req.cookies?.token, req.headers.authorization);
  if (!token) return next(ApiError.unauthorized());

  let userId: string;
  try {
    userId = verifyToken(token).sub;
  } catch {
    return next(ApiError.unauthorized('Session expired or invalid, please log in again'));
  }

  // make sure the account still exists (cheap _id lookup)
  const user = await findUserById(userId);
  if (!user) return next(ApiError.unauthorized('User no longer exists'));

  req.user = user;
  next();
};

export const requireRole =
  (...roles: string[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return next(ApiError.forbidden());
    next();
  };
