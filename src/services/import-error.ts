import mongoose from 'mongoose';
import { ZodError } from 'zod';

export function importErrorMessage(error: unknown): string | null {
  if (error instanceof ZodError) return error.issues.map((issue) => issue.message).join('; ');
  if (error instanceof mongoose.Error.ValidationError) {
    return Object.values(error.errors).map((issue) => issue.message).join('; ');
  }

  const mongoError = error as { code?: number; keyValue?: Record<string, unknown> };
  if (mongoError?.code === 11000) {
    const field = Object.keys(mongoError.keyValue ?? {})[0] ?? 'field';
    return `${field} is already in use`;
  }

  return null;
}
