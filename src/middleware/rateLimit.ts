import rateLimit from 'express-rate-limit';
import { ApiError } from '../utils/ApiError';

/**
 * 10 failed login attempts per IP per 15 minutes. Successful logins don't
 * count, so a real user who mistypes once isn't locked out.
 * Note: the default store is in-memory (per instance). For multiple
 * instances a shared store (Redis) would be the next step.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new ApiError('RATE_LIMITED', 'Too many login attempts, please try again in 15 minutes'));
  },
});
