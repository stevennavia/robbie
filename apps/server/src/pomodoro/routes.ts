import { Router, type Request, type Response } from 'express';
import {
  ERROR_CODES,
  createApiError,
  type ApiErrorResponse,
  type PomodoroSession,
  updateSettingsSchema,
} from '@robbie/shared';
import { PomodoroTimerService } from './service.js';

export function createPomodoroRouter(service: PomodoroTimerService): Router {
  const router = Router();

  function sendSession(res: Response, session: PomodoroSession): void {
    res.json(session);
  }

  function sendError(res: Response, status: number, code: string, message: string): void {
    const body: ApiErrorResponse = { error: createApiError(code, message) };
    res.status(status).json(body);
  }

  router.get('/current', (_req: Request, res: Response) => {
    try {
      sendSession(res, service.getCurrent());
    } catch {
      sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Error al obtener la sesión actual');
    }
  });

  router.get('/settings', (_req: Request, res: Response) => {
    try {
      res.json(service.getSettings());
    } catch {
      sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Error al obtener la configuración');
    }
  });

  router.patch('/settings', (req: Request, res: Response) => {
    try {
      const result = updateSettingsSchema.safeParse(req.body);
      if (!result.success) {
        sendError(res, 400, ERROR_CODES.VALIDATION_ERROR, 'Configuración inválida');
        return;
      }
      res.json(service.updateSettings(result.data));
    } catch {
      sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Error al actualizar la configuración');
    }
  });

  router.post('/start', (req: Request, res: Response) => {
    try {
      const mode = req.body?.mode === 'short_break' || req.body?.mode === 'long_break'
        ? req.body.mode
        : 'focus';
      sendSession(res, service.start(mode));
    } catch {
      sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Error al iniciar la sesión');
    }
  });

  router.post('/pause', (_req: Request, res: Response) => {
    try {
      sendSession(res, service.pause());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al pausar';
      sendError(res, 400, ERROR_CODES.VALIDATION_ERROR, message);
    }
  });

  router.post('/resume', (_req: Request, res: Response) => {
    try {
      sendSession(res, service.resume());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al reanudar';
      sendError(res, 400, ERROR_CODES.VALIDATION_ERROR, message);
    }
  });

  router.post('/cancel', (_req: Request, res: Response) => {
    try {
      sendSession(res, service.cancel());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al cancelar';
      sendError(res, 400, ERROR_CODES.VALIDATION_ERROR, message);
    }
  });

  router.post('/skip', (_req: Request, res: Response) => {
    try {
      sendSession(res, service.skipBreak());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al omitir descanso';
      sendError(res, 400, ERROR_CODES.VALIDATION_ERROR, message);
    }
  });

  router.post('/complete', (_req: Request, res: Response) => {
    try {
      sendSession(res, service.complete());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al completar';
      sendError(res, 400, ERROR_CODES.VALIDATION_ERROR, message);
    }
  });

  router.post('/start-break', (_req: Request, res: Response) => {
    try {
      sendSession(res, service.startBreak());
    } catch {
      sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Error al iniciar descanso');
    }
  });

  return router;
}
