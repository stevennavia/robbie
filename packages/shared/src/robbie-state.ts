import { z } from 'zod';

/**
 * Estados posibles de Robbie. Representan lo que el robot está haciendo
 * o su condición general en un momento dado.
 */
export const ROBBIE_STATES = [
  'idle',
  'listening',
  'thinking',
  'speaking',
  'focus',
  'paused',
  'success',
  'alert',
  'error',
  'offline',
] as const;

export const robbieStateSchema = z.enum(ROBBIE_STATES);

export type RobbieState = z.infer<typeof robbieStateSchema>;

/** Etiquetas en español para mostrar cada estado en la interfaz. */
export const ROBBIE_STATE_LABELS: Record<RobbieState, string> = {
  idle: 'En reposo',
  listening: 'Escuchando',
  thinking: 'Pensando',
  speaking: 'Hablando',
  focus: 'Enfoque',
  paused: 'En pausa',
  success: 'Feliz',
  alert: 'Alerta',
  error: 'Error',
  offline: 'Sin conexión',
};

export function isRobbieState(value: unknown): value is RobbieState {
  return robbieStateSchema.safeParse(value).success;
}
