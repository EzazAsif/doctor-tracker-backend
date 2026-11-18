import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Express 5 already forwards rejected promises to the error handler, but
 * wrapping keeps controllers explicit and safe if they're ever reused with
 * plain callbacks or a different router.
 */
export const asyncHandler =
  <Req extends Request = Request>(fn: (req: Req, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req as Req, res, next)).catch(next);
  };
