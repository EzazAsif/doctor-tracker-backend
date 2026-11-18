import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { ApiError, type ErrorDetail } from '../utils/ApiError';
import { env } from '../config/env';

export const notFound: RequestHandler = (req, _res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

function normalize(err: unknown): ApiError {
  if (err instanceof ApiError) return err;

  if (err instanceof ZodError) {
    const details: ErrorDetail[] = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    return ApiError.badRequest('Invalid input', details);
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
    return ApiError.badRequest('Invalid input', details);
  }

  if (err instanceof mongoose.Error.CastError) {
    return ApiError.badRequest('Invalid input', [{ path: err.path, message: `Invalid value for ${err.path}` }]);
  }

  // duplicate key from a unique index
  const mongoErr = err as { code?: number; keyValue?: Record<string, unknown> };
  if (mongoErr?.code === 11000) {
    const field = Object.keys(mongoErr.keyValue ?? {})[0] ?? 'field';
    return ApiError.conflict(`A record with this ${field} already exists`, [
      { path: field, message: `${field} is already in use` },
    ]);
  }

  // bad json / body too big
  const httpErr = err as { type?: string; status?: number };
  if (httpErr?.type === 'entity.parse.failed') return ApiError.badRequest('Malformed JSON body');
  if (httpErr?.type === 'entity.too.large') return ApiError.badRequest('Request body is too large');

  return new ApiError('INTERNAL_ERROR', 'Something went wrong');
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const apiErr = normalize(err);

  if (apiErr.status >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, err);
  }

  res.status(apiErr.status).json({
    error: {
      code: apiErr.code,
      message: apiErr.message,
      ...(apiErr.details?.length ? { details: apiErr.details } : {}),
      ...(!env.isProd && apiErr.status >= 500 && err instanceof Error ? { stack: err.stack } : {}),
    },
  });
};
