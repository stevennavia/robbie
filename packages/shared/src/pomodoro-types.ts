import { z } from 'zod';

export const POMODORO_STATUSES = [
  'ready',
  'focus',
  'paused',
  'short_break',
  'long_break',
  'completed',
  'cancelled',
] as const;

export const pomodoroStatusSchema = z.enum(POMODORO_STATUSES);

export type PomodoroStatus = z.infer<typeof pomodoroStatusSchema>;

export const POMODORO_STATUS_LABELS: Record<PomodoroStatus, string> = {
  ready: 'Listo',
  focus: 'Enfoque',
  paused: 'En pausa',
  short_break: 'Descanso corto',
  long_break: 'Descanso largo',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

export const pomodoroSettingsSchema = z.object({
  focusDurationSeconds: z.number().int().min(60).max(7200).default(1500),
  shortBreakDurationSeconds: z.number().int().min(60).max(3600).default(300),
  longBreakDurationSeconds: z.number().int().min(60).max(7200).default(900),
  longBreakInterval: z.number().int().min(1).max(99).default(4),
  soundEnabled: z.boolean().default(true),
  notificationsEnabled: z.boolean().default(false),
});

export type PomodoroSettings = z.infer<typeof pomodoroSettingsSchema>;

export const updateSettingsSchema = pomodoroSettingsSchema.partial();

export type UpdateSettingsPayload = z.infer<typeof updateSettingsSchema>;

export const pomodoroSessionSchema = z.object({
  mode: pomodoroStatusSchema,
  durationSeconds: z.number().int(),
  startedAt: z.string().datetime().nullable(),
  endsAt: z.string().datetime().nullable(),
  pausedAt: z.string().datetime().nullable(),
  remainingSeconds: z.number().int().min(0),
  completedSessions: z.number().int().min(0),
  status: pomodoroStatusSchema,
});

export type PomodoroSession = z.infer<typeof pomodoroSessionSchema>;

export const startFocusSchema = z.object({
  mode: z.literal('focus').default('focus'),
});

export type StartFocusPayload = z.infer<typeof startFocusSchema>;

export function formatRemaining(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

const POMODORO_ROBBIE_MAP: Record<PomodoroStatus, string> = {
  ready: 'idle',
  focus: 'focus',
  paused: 'paused',
  short_break: 'paused',
  long_break: 'paused',
  completed: 'success',
  cancelled: 'idle',
};

export function pomodoroToRobbieState(status: PomodoroStatus): string {
  return POMODORO_ROBBIE_MAP[status];
}
