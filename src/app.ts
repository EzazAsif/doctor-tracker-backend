import express from 'express';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { env } from './config/env';
import { connectDB, dbStatus } from './config/db';
import { ensureDb } from './middleware/ensureDb';
import routes from './routes';
import { errorHandler, notFound } from './middleware/errorHandler';

const app = express();

app.disable('x-powered-by');
// behind vercel proxy, so rate limit sees real ip
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: env.clientOrigins,
    credentials: true,
  }),
);
app.use(compression());
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(morgan(env.isProd ? 'combined' : 'dev'));

app.get('/api/health', async (_req, res) => {
  try {
    await connectDB();
  } catch {
    // shows up as disconnected below
  }
  const db = dbStatus();
  res.status(db === 'connected' ? 200 : 503).json({ status: db === 'connected' ? 'ok' : 'degraded', db });
});

app.use('/api', ensureDb);
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
