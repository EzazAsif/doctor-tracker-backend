import mongoose from 'mongoose';
import { env } from './env';

/**
 * Serverless functions can be re-used between invocations, so we keep the
 * connection promise on globalThis. Warm invocations then skip the handshake
 * and concurrent cold requests share a single connect() call.
 */
type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

const globalForMongo = globalThis as unknown as { _mongo?: Cache };
const cache: Cache = globalForMongo._mongo ?? { conn: null, promise: null };
globalForMongo._mongo = cache;

mongoose.set('strictQuery', true);

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn && mongoose.connection.readyState === 1) return cache.conn;

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(env.MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 8000,
        autoIndex: !env.isProd,
      })
      .catch((err) => {
        // let the next request retry instead of caching a failed promise
        cache.promise = null;
        throw err;
      });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}

export function dbStatus(): 'connected' | 'connecting' | 'disconnected' {
  const state = mongoose.connection.readyState;
  if (state === 1) return 'connected';
  if (state === 2) return 'connecting';
  return 'disconnected';
}
