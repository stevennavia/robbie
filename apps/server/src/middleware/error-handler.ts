import { ERROR_CODES, createApiError, type ApiErrorResponse } from '@robbie/shared';
import type { NextFunction, Request, Response } from 'express';

/** Responde con un 404 estructurado para cualquier ruta no registrada. */
export function notFoundHandler(req: Request, res: Response): void {
  const body: ApiErrorResponse = {
    error: createApiError(ERROR_CODES.NOT_FOUND, `Ruta no encontrada: ${req.method} ${req.path}`),
  };
  res.status(404).json(body);
}

/** Middleware centralizado de errores: ningún fallo sale sin estructura. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const stamp = new Date().toISOString();
  console.error(`[${stamp}] Error no controlado:`, err instanceof Error ? err.message : err);

  const body: ApiErrorResponse = {
    error: createApiError(ERROR_CODES.INTERNAL_ERROR, 'Error interno del servidor'),
  };
  res.status(500).json(body);
}
