import type { HealthResponse } from '@robbie/shared';
import { Router, type Request, type Response } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  const body: HealthResponse = {
    status: 'ok',
    service: 'robbie-server',
    timestamp: new Date().toISOString(),
  };
  res.status(200).json(body);
});
