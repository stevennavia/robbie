import cors from 'cors';
import express, { type Express } from 'express';
import type { AppConfig } from './config.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { healthRouter } from './routes/health.js';
import { createRootRouter } from './routes/root.js';

export function createApp(config: AppConfig): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());

  // CORS restringido únicamente al cliente local configurado.
  app.use(cors({ origin: config.CLIENT_ORIGIN }));

  app.use('/', createRootRouter(config));
  app.use('/api/health', healthRouter);

  // Cualquier ruta no registrada recibe un 404 estructurado.
  app.use(notFoundHandler);

  // Middleware centralizado de errores (siempre el último).
  app.use(errorHandler);

  return app;
}
