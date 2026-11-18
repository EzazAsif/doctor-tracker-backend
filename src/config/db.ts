import mongoose from 'mongoose';
import { env } from './env';

// cache the connect promise on globalThis so serverles doesnt reconnect every request
type Cache = { promise: Promise<typeof mongoose> | null; settled: boolean };

const globalForMongo = globalThis as unknown as { _mongo?: Cache };
const cache: Cache = globalForMongo._mongo ?? { promise: null, settled: false };
globalForMongo._mongo = cache;

mongoose.set('strictQuery', true);

const STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'] as const;

export async function connectDB(): Promise<typeof mongoose> {
  const state = mongoose.connection.readyState;
  if (state === 1) return mongoose;

  // driver is reconnecting on its own, just wait for it
  if (state === 2 && cache.settled) return waitForConnected(8000);

  // idle/frozen instance can lose the socket after the first connect resolved,
  // so if were not connecting right now, connect again
  if (!cache.promise || state !== 2) {
    cache.settled = false;
    cache.promise = mongoose
      .connect(env.MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 8000,
        autoIndex: !env.isProd,
      })
      .then((m) => {
        cache.settled = true;
        return m;
      })
      .catch((err) => {
        // dont cache a failed connect, next request retries
        cache.promise = null;
        cache.settled = false;
        throw err;
      });
  }

  return cache.promise;
}

function waitForConnected(ms: number): Promise<typeof mongoose> {
  return new Promise((resolve, reject) => {
    const onConnected = () => {
      clearTimeout(timer);
      resolve(mongoose);
    };
    const timer = setTimeout(() => {
      mongoose.connection.off('connected', onConnected);
      reject(new Error('Timed out waiting for MongoDB to reconnect'));
    }, ms);
    mongoose.connection.once('connected', onConnected);
  });
}

export function dbStatus(): (typeof STATES)[number] {
  return STATES[mongoose.connection.readyState as number] ?? 'disconnected';
}
