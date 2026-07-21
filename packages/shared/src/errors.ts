import type { ApiError } from './api-types.js';

/** Códigos de error conocidos en toda la aplicación. */
export const ERROR_CODES = {
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_MESSAGE: 'INVALID_MESSAGE',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** Crea un ApiError sin incluir `details` cuando no se proporciona. */
export function createApiError(code: ErrorCode | string, message: string, details?: unknown): ApiError {
  if (details === undefined) {
    return { code, message };
  }
  return { code, message, details };
}
