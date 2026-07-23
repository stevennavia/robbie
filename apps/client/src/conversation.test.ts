import { describe, expect, it, vi } from 'vitest';
import { ConversationSimulation } from './conversation';

describe('simulación de conversación de Robbie', () => {
  it('recorre escucha, pensamiento, habla y vuelve a reposo', () => {
    vi.useFakeTimers();
    const states: string[] = [];
    const simulation = new ConversationSimulation((state) => states.push(state));

    simulation.start();
    expect(states).toEqual(['listening']);
    vi.advanceTimersByTime(900);
    expect(states).toEqual(['listening', 'thinking']);
    vi.advanceTimersByTime(1200);
    expect(states).toEqual(['listening', 'thinking', 'speaking']);
    vi.advanceTimersByTime(2000);
    expect(states).toEqual(['listening', 'thinking', 'speaking', 'idle']);
    expect(simulation.isActive).toBe(false);
    vi.useRealTimers();
  });

  it('ignora un segundo inicio mientras la secuencia está activa', () => {
    vi.useFakeTimers();
    const states: string[] = [];
    const simulation = new ConversationSimulation((state) => states.push(state));

    simulation.start();
    simulation.start();
    expect(states).toEqual(['listening']);
    vi.useRealTimers();
  });

  it('cancela el timer sin generar estados residuales', () => {
    vi.useFakeTimers();
    const states: string[] = [];
    const simulation = new ConversationSimulation((state) => states.push(state));

    simulation.start();
    simulation.cancel();
    vi.advanceTimersByTime(5000);
    expect(states).toEqual(['listening']);
    expect(simulation.isActive).toBe(false);
    vi.useRealTimers();
  });
});
