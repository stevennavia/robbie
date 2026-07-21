import { ROBBIE_STATE_LABELS, type RobbieState } from '@robbie/shared';

export interface StateVisual {
  /** Brillo de los ojos: 0 = apagados, 1 = máximo. */
  eyeIntensity: number;
  /** Color de acento del estado (hex). Referencia; el CSS lo aplica vía data-state. */
  accent: string;
  /** Etiqueta accesible en español. */
  label: string;
}

const STATE_VISUALS: Record<RobbieState, { eyeIntensity: number; accent: string }> = {
  idle: { eyeIntensity: 0.85, accent: '#4cc2ff' },
  listening: { eyeIntensity: 1, accent: '#3ecf8e' },
  thinking: { eyeIntensity: 0.65, accent: '#f5a623' },
  speaking: { eyeIntensity: 0.95, accent: '#b18cff' },
  focus: { eyeIntensity: 0.9, accent: '#46d0c4' },
  paused: { eyeIntensity: 0.35, accent: '#9aa3b2' },
  success: { eyeIntensity: 1, accent: '#3ecf8e' },
  alert: { eyeIntensity: 0.9, accent: '#ff9f43' },
  error: { eyeIntensity: 0.9, accent: '#ef5261' },
  offline: { eyeIntensity: 0.12, accent: '#2a2f3a' },
};

/**
 * Mapea un estado de Robbie a su representación visual de la Fase 2:
 * etiqueta, intensidad de los ojos y un único acento (aro del botón).
 * El motor completo de expresiones llegará en la Fase 3.
 */
export function getStateVisual(state: RobbieState): StateVisual {
  const visual = STATE_VISUALS[state];
  return { ...visual, label: ROBBIE_STATE_LABELS[state] };
}
