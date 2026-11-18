import app from './app';
import { env } from './config/env';

// vercel uses the exported app, only listen locally
if (!process.env.VERCEL) {
  const server = app.listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT}`);
  });
  server.on('error', (err: NodeJS.ErrnoException) => {
    console.error(err.code === 'EADDRINUSE' ? `Port ${env.PORT} is already in use` : err);
    process.exit(1);
  });
}

export default app;
