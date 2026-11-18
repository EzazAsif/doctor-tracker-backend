import rateLimit from 'express-rate-limit';
import { ApiError } from '../utils/ApiError';

// 10 failed logins / 15 min per ip. memory store is per instance
// TODO redis store if this ever runs on lots of instances
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
