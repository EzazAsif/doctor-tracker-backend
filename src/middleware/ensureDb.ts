import type { RequestHandler } from 'express';
import { connectDB } from '../config/db';

export const ensureDb: RequestHandler = async (_req, _res, next) => {
  await connectDB();
  next();
};
