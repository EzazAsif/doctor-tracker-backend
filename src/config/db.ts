import mongoose from 'mongoose';
import { env } from './env';

// cache conn on globalThis so serverles doesnt reconnect every request
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
        // dont cache a failed connect, next request retries
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
