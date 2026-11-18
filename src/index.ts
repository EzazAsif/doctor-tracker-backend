import app from './app';
import { env } from './config/env';

// On Vercel the exported app is used as the request handler,
// so we only bind a port when running it ourselves.
if (!process.env.VERCEL) {
  app.listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT}`);
  });
}

export default app;
