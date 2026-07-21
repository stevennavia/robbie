import type { RootInfoResponse } from '@robbie/shared';
import { Router, type Request, type Response } from 'express';
import type { AppConfig } from '../config.js';

/**
 * Ruta raíz del servidor: responde un JSON informativo que orienta
 * hacia el cliente web y el endpoint de salud. La API sigue siendo
 * independiente del cliente (sin redirecciones ni estáticos).
 */
export function createRootRouter(config: AppConfig): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    const body: RootInfoResponse = {
      service: 'robbie-server',
      status: 'ok',
      client: config.CLIENT_ORIGIN,
      health: '/api/health',
    };
    res.status(200).json(body);
  });

  return router;
}
