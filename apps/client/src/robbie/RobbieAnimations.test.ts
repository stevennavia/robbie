import { ROBBIE_STATES } from '@robbie/shared';
import { describe, expect, it } from 'vitest';
import { TEMPORARY_STATE_DURATION } from './RobbieAnimations';

describe('módulo visual original de Robbie', () => {
  it('mantiene los diez estados compartidos', () => {
    expect(ROBBIE_STATES).toEqual([
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
    ]);
  });

  it('define estados temporales con duración positiva', () => {
    expect(TEMPORARY_STATE_DURATION.success).toBeGreaterThan(0);
    expect(TEMPORARY_STATE_DURATION.alert).toBeGreaterThan(0);
    expect(TEMPORARY_STATE_DURATION.error).toBeGreaterThan(0);
  });
});
