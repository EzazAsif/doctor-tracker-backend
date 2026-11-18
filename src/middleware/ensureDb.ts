import type { RequestHandler } from 'express';
import { connectDB } from '../config/db';

// Makes sure the (cached) connection is ready before a handler touches a model.
export const ensureDb: RequestHandler = async (_req, _res, next) => {
  await connectDB();
  next();
};
