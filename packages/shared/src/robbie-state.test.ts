import { describe, expect, it } from 'vitest';
import { ROBBIE_STATE_LABELS, ROBBIE_STATES, isRobbieState, robbieStateSchema } from './robbie-state.js';

describe('robbieStateSchema', () => {
  it('define exactamente los 10 estados de Robbie', () => {
    expect(ROBBIE_STATES).toHaveLength(10);
  });

  it('muestra success con la etiqueta Feliz', () => {
    expect(ROBBIE_STATE_LABELS.success).toBe('Feliz');
  });

  it.each(ROBBIE_STATES)('acepta el estado "%s"', (state) => {
    expect(robbieStateSchema.safeParse(state).success).toBe(true);
    expect(isRobbieState(state)).toBe(true);
  });

  it.each(['IDLE', 'sleep', '', 'unknown'])('rechaza la cadena inválida "%s"', (value) => {
    expect(robbieStateSchema.safeParse(value).success).toBe(false);
    expect(isRobbieState(value)).toBe(false);
  });

  it.each([42, null, undefined, {}, ['idle']])('rechaza el valor no textual %j', (value) => {
    expect(robbieStateSchema.safeParse(value).success).toBe(false);
    expect(isRobbieState(value)).toBe(false);
  });
});
