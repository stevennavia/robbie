import { ROBBIE_STATES, ROBBIE_STATE_LABELS } from '@robbie/shared';
import { describe, expect, it } from 'vitest';
import { getStateVisual } from './state-visuals';

describe('getStateVisual', () => {
  it.each(ROBBIE_STATES)('devuelve visuales válidas para "%s"', (state) => {
    const visual = getStateVisual(state);

    expect(visual.eyeIntensity).toBeGreaterThanOrEqual(0);
    expect(visual.eyeIntensity).toBeLessThanOrEqual(1);
    expect(visual.accent).toMatch(/^#[0-9a-f]{6}$/i);
    expect(visual.label).toBe(ROBBIE_STATE_LABELS[state]);
    expect(visual.label.length).toBeGreaterThan(0);
  });

  it('offline es el estado con los ojos más apagados', () => {
    const intensities = ROBBIE_STATES.map((state) => getStateVisual(state).eyeIntensity);
    expect(Math.min(...intensities)).toBe(getStateVisual('offline').eyeIntensity);
  });

  it('listening y success usan el brillo máximo', () => {
    expect(getStateVisual('listening').eyeIntensity).toBe(1);
    expect(getStateVisual('success').eyeIntensity).toBe(1);
  });
});
