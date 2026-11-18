import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { ApiError } from '../utils/ApiError';

type Schemas = { body?: ZodType; query?: ZodType; params?: ZodType };

/**
 * Parses body / query / params with zod and replaces them with the parsed
 * (coerced, defaulted, stripped) values. Zod errors are turned into a
 * VALIDATION_ERROR by the error handler.
 */
export const validate =
  (schemas: Schemas): RequestHandler =>
  (req, _res, next) => {
    if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params;
    if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
    if (schemas.query) {
      // req.query is a getter in Express 5, so redefine it with the parsed value
      Object.defineProperty(req, 'query', {
        value: schemas.query.parse(req.query),
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
    next();
  };

// mongoose.isValidObjectId also accepts any 12 char string, so check the hex form
const OBJECT_ID = /^[a-f\d]{24}$/i;

/** 400 for any route param that isn't a valid ObjectId, e.g. validateObjectId('id'). */
export const validateObjectId =
  (...names: string[]): RequestHandler =>
  (req, _res, next) => {
    const bad = names.filter((n) => !OBJECT_ID.test(String(req.params[n] ?? '')));
    if (bad.length) {
      return next(ApiError.badRequest('Invalid id', bad.map((n) => ({ path: n, message: 'Must be a valid ObjectId' }))));
    }
    next();
  };
