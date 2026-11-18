import express from 'express';
import morgan from 'morgan';
import { env } from './config/env';

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use(morgan(env.isProd ? 'combined' : 'dev'));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default app;
