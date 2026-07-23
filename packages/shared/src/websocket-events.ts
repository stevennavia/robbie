import { z } from 'zod';
import { apiErrorSchema } from './api-types.js';
import { pomodoroStatusSchema } from './pomodoro-types.js';
import { robbieStateSchema } from './robbie-state.js';

export const WS_EVENT_TYPES = [
  'connection.ready',
  'robbie.state.changed',
  'system.error',
  'pomodoro.started',
  'pomodoro.paused',
  'pomodoro.resumed',
  'pomodoro.completed',
  'pomodoro.cancelled',
  'pomodoro.settings.updated',
] as const;

/* ------------------------------------------------------------------ */
/*  Eventos existentes                                                 */
/* ------------------------------------------------------------------ */

export const connectionReadyEventSchema = z.object({
  type: z.literal('connection.ready'),
  payload: z.object({ connected: z.boolean() }),
});

export const robbieStateChangedEventSchema = z.object({
  type: z.literal('robbie.state.changed'),
  payload: z.object({
    state: robbieStateSchema,
    previousState: robbieStateSchema.optional(),
  }),
});

export const systemErrorEventSchema = z.object({
  type: z.literal('system.error'),
  payload: z.object({ error: apiErrorSchema }),
});

/* ------------------------------------------------------------------ */
/*  Eventos del Pomodoro                                               */
/* ------------------------------------------------------------------ */

export const pomodoroStartedEventSchema = z.object({
  type: z.literal('pomodoro.started'),
  payload: z.object({
    mode: pomodoroStatusSchema,
    durationSeconds: z.number().int(),
    endsAt: z.string().datetime(),
  }),
});

export const pomodoroPausedEventSchema = z.object({
  type: z.literal('pomodoro.paused'),
  payload: z.object({ remainingSeconds: z.number().int() }),
});

export const pomodoroResumedEventSchema = z.object({
  type: z.literal('pomodoro.resumed'),
  payload: z.object({ endsAt: z.string().datetime() }),
});

export const pomodoroCompletedEventSchema = z.object({
  type: z.literal('pomodoro.completed'),
  payload: z.object({
    mode: pomodoroStatusSchema,
    completedSessions: z.number().int().min(0),
  }),
});

export const pomodoroCancelledEventSchema = z.object({
  type: z.literal('pomodoro.cancelled'),
  payload: z.object({}),
});

export const pomodoroSettingsUpdatedEventSchema = z.object({
  type: z.literal('pomodoro.settings.updated'),
  payload: z.object({
    settings: z.object({
      focusDurationSeconds: z.number().int(),
      shortBreakDurationSeconds: z.number().int(),
      longBreakDurationSeconds: z.number().int(),
      longBreakInterval: z.number().int(),
      soundEnabled: z.boolean(),
      notificationsEnabled: z.boolean(),
    }),
  }),
});

/* ------------------------------------------------------------------ */
/*  Esquema discriminado maestro                                       */
/* ------------------------------------------------------------------ */

export const webSocketEventSchema = z.discriminatedUnion('type', [
  connectionReadyEventSchema,
  robbieStateChangedEventSchema,
  systemErrorEventSchema,
  pomodoroStartedEventSchema,
  pomodoroPausedEventSchema,
  pomodoroResumedEventSchema,
  pomodoroCompletedEventSchema,
  pomodoroCancelledEventSchema,
  pomodoroSettingsUpdatedEventSchema,
]);

export type ConnectionReadyEvent = z.infer<typeof connectionReadyEventSchema>;
export type RobbieStateChangedEvent = z.infer<typeof robbieStateChangedEventSchema>;
export type SystemErrorEvent = z.infer<typeof systemErrorEventSchema>;

export type PomodoroStartedEvent = z.infer<typeof pomodoroStartedEventSchema>;
export type PomodoroPausedEvent = z.infer<typeof pomodoroPausedEventSchema>;
export type PomodoroResumedEvent = z.infer<typeof pomodoroResumedEventSchema>;
export type PomodoroCompletedEvent = z.infer<typeof pomodoroCompletedEventSchema>;
export type PomodoroCancelledEvent = z.infer<typeof pomodoroCancelledEventSchema>;
export type PomodoroSettingsUpdatedEvent = z.infer<typeof pomodoroSettingsUpdatedEventSchema>;

export type WebSocketEvent = z.infer<typeof webSocketEventSchema>;

export type ParseWebSocketEventResult =
  | { success: true; event: WebSocketEvent }
  | { success: false; error: z.ZodError };

export function parseWebSocketEvent(data: unknown): ParseWebSocketEventResult {
  const result = webSocketEventSchema.safeParse(data);
  if (result.success) {
    return { success: true, event: result.data };
  }
  return { success: false, error: result.error };
}
