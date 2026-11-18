import express from 'express';
import morgan from 'morgan';
import { env } from './config/env';
import { connectDB, dbStatus } from './config/db';
import { ensureDb } from './middleware/ensureDb';
import { errorHandler, notFound } from './middleware/errorHandler';

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use(morgan(env.isProd ? 'combined' : 'dev'));

app.get('/api/health', async (_req, res) => {
  try {
    await connectDB();
  } catch {
    // reported below as disconnected
  }
  const db = dbStatus();
  res.status(db === 'connected' ? 200 : 503).json({ status: db === 'connected' ? 'ok' : 'degraded', db });
});

// every route registered after this point can assume the db is ready
app.use('/api', ensureDb);

app.use(notFound);
app.use(errorHandler);

export default app;
