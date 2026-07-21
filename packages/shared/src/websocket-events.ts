import { z } from 'zod';
import { apiErrorSchema } from './api-types.js';
import { robbieStateSchema } from './robbie-state.js';

export const WS_EVENT_TYPES = ['connection.ready', 'robbie.state.changed', 'system.error'] as const;

/** El servidor lo envía a cada cliente justo después de conectarse. */
export const connectionReadyEventSchema = z.object({
  type: z.literal('connection.ready'),
  payload: z.object({
    connected: z.boolean(),
  }),
});

/** Notifica que Robbie cambió de estado (por ejemplo: idle -> thinking). */
export const robbieStateChangedEventSchema = z.object({
  type: z.literal('robbie.state.changed'),
  payload: z.object({
    state: robbieStateSchema,
    previousState: robbieStateSchema.optional(),
  }),
});

/** El servidor lo envía cuando algo falla (mensaje inválido, error interno, ...). */
export const systemErrorEventSchema = z.object({
  type: z.literal('system.error'),
  payload: z.object({
    error: apiErrorSchema,
  }),
});

export const webSocketEventSchema = z.discriminatedUnion('type', [
  connectionReadyEventSchema,
  robbieStateChangedEventSchema,
  systemErrorEventSchema,
]);

export type ConnectionReadyEvent = z.infer<typeof connectionReadyEventSchema>;
export type RobbieStateChangedEvent = z.infer<typeof robbieStateChangedEventSchema>;
export type SystemErrorEvent = z.infer<typeof systemErrorEventSchema>;
export type WebSocketEvent = z.infer<typeof webSocketEventSchema>;

export type ParseWebSocketEventResult =
  | { success: true; event: WebSocketEvent }
  | { success: false; error: z.ZodError };

/**
 * Valida un mensaje WebSocket recibido (ya convertido desde JSON).
 * Nunca lanza excepciones: devuelve un resultado discriminado.
 */
export function parseWebSocketEvent(data: unknown): ParseWebSocketEventResult {
  const result = webSocketEventSchema.safeParse(data);
  if (result.success) {
    return { success: true, event: result.data };
  }
  return { success: false, error: result.error };
}
