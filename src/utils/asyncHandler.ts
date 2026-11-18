import type { NextFunction, Request, RequestHandler, Response } from 'express';

// express 5 catches async errors already, keeping this to be explicit
export const asyncHandler =
  <Req extends Request = Request>(fn: (req: Req, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req as Req, res, next)).catch(next);
  };
