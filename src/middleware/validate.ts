import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { ApiError } from '../utils/ApiError';

// ?specialization= from a cleared dropdown means no filter
const dropEmpty = (q: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(q).filter(([, v]) => v !== '' && v !== undefined));

type Schemas = { body?: ZodType; query?: ZodType; params?: ZodType };

export const validate =
  (schemas: Schemas): RequestHandler =>
  (req, _res, next) => {
    if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params;
    if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
    if (schemas.query) {
      // req.query is a getter in express 5 so we redefine it
      Object.defineProperty(req, 'query', {
        value: schemas.query.parse(dropEmpty(req.query)),
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
    next();
  };

// isValidObjectId lets any 12 char string through
const OBJECT_ID = /^[a-f\d]{24}$/i;

export const validateObjectId =
  (...names: string[]): RequestHandler =>
  (req, _res, next) => {
    const bad = names.filter((n) => !OBJECT_ID.test(String(req.params[n] ?? '')));
    if (bad.length) {
      return next(ApiError.badRequest('Invalid id', bad.map((n) => ({ path: n, message: 'Must be a valid ObjectId' }))));
    }
    next();
  };
