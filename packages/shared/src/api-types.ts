import { z } from 'zod';

/** Error estructurado que devuelve la API HTTP y el canal WebSocket. */
export const apiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.unknown().optional(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

/** Envoltura estándar de error en respuestas HTTP: `{ "error": { ... } }`. */
export const apiErrorResponseSchema = z.object({
  error: apiErrorSchema,
});

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

/** Respuesta del endpoint GET /api/health. */
export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.string().min(1),
  timestamp: z.string().datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

/** Respuesta informativa del endpoint GET / (raíz del servidor). */
export const rootInfoResponseSchema = z.object({
  service: z.string().min(1),
  status: z.literal('ok'),
  client: z.string().min(1),
  health: z.string().min(1),
});

export type RootInfoResponse = z.infer<typeof rootInfoResponseSchema>;
