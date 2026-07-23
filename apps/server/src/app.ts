import cors from 'cors';
import express, { type Express } from 'express';
import type { AppConfig } from './config.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { healthRouter } from './routes/health.js';
import { createRootRouter } from './routes/root.js';
import type { PomodoroTimerService } from './pomodoro/service.js';
import { createPomodoroRouter } from './pomodoro/routes.js';

export function createApp(config: AppConfig, pomodoroService?: PomodoroTimerService): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());

  app.use(cors({ origin: config.CLIENT_ORIGIN }));

  app.use('/', createRootRouter(config));
  app.use('/api/health', healthRouter);

  if (pomodoroService) {
    app.use('/api/pomodoro', createPomodoroRouter(pomodoroService));
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
