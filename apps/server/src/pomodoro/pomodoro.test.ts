import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { unlinkSync, existsSync } from 'node:fs';

const TEST_DB_PATH = '/tmp/robbie-pomodoro-test.db';

import { initDb, closeDb, setDbPath } from './db.js';
import { PomodoroTimerService } from './service.js';

describe('PomodoroTimerService', () => {
  let service: PomodoroTimerService;
  const events: unknown[] = [];

  beforeAll(async () => {
    setDbPath(TEST_DB_PATH);
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }
    await initDb();
    service = new PomodoroTimerService((event) => {
      events.push(event);
    });
  });

  afterAll(async () => {
    service.stop();
    await closeDb();
  });

  beforeEach(() => {
    events.length = 0;
  });

  it('comienza en estado ready', () => {
    const current = service.getCurrent();
    expect(current.status).toBe('ready');
    expect(current.mode).toBe('ready');
    expect(current.remainingSeconds).toBe(0);
  });

  it('inicia una sesión de enfoque', () => {
    const session = service.start('focus');
    expect(session.status).toBe('focus');
    expect(session.mode).toBe('focus');
    expect(session.durationSeconds).toBe(1500);
    expect(session.remainingSeconds).toBeGreaterThan(0);
    expect(session.endsAt).not.toBeNull();
    expect(events.length).toBeGreaterThanOrEqual(1);
    const started = events[0] as { type: string };
    expect(started.type).toBe('pomodoro.started');
  });

  it('pausa una sesión activa', () => {
    const session = service.pause();
    expect(session.status).toBe('paused');
    expect(session.remainingSeconds).toBeGreaterThan(0);
    expect(session.pausedAt).not.toBeNull();
    const paused = events[events.length - 1] as { type: string };
    expect(paused.type).toBe('pomodoro.paused');
  });

  it('reanuda una sesión pausada', () => {
    const session = service.resume();
    expect(session.status).toBe('focus');
    expect(session.endsAt).not.toBeNull();
    expect(session.pausedAt).toBeNull();
    const resumed = events[events.length - 1] as { type: string };
    expect(resumed.type).toBe('pomodoro.resumed');
  });

  it('cancela una sesión activa', () => {
    const session = service.cancel();
    expect(session.status).toBe('ready');
    const cancelled = events[events.length - 1] as { type: string };
    expect(cancelled.type).toBe('pomodoro.cancelled');
  });

  it('vuelve a ready tras cancelar', () => {
    const current = service.getCurrent();
    expect(current.status).toBe('ready');
  });

  it('finaliza una sesión', () => {
    service.start('focus');
    const session = service.complete();
    expect(session.status).toBe('completed');
    const completed = events[events.length - 1] as { type: string };
    expect(completed.type).toBe('pomodoro.completed');
  });

  it('inicia descanso corto cuando no corresponde largo', () => {
    /* Ya hay un focus completado, el descanso largo es cada 4 */
    const session = service.start('short_break');
    expect(session.status).toBe('short_break');
    expect(session.durationSeconds).toBe(300);
  });

  it('cancela el descanso con skip', () => {
    const session = service.skipBreak();
    expect(session.status).toBe('ready');
  });

  it('persiste y recupera configuración', () => {
    const settings = service.getSettings();
    expect(settings.focusDurationSeconds).toBe(1500);
    expect(settings.shortBreakDurationSeconds).toBe(300);
    expect(settings.longBreakDurationSeconds).toBe(900);
    expect(settings.longBreakInterval).toBe(4);
    expect(settings.soundEnabled).toBe(true);
    expect(settings.notificationsEnabled).toBe(false);
  });

  it('actualiza configuración', () => {
    const updated = service.updateSettings({ focusDurationSeconds: 1800 });
    expect(updated.focusDurationSeconds).toBe(1800);
    expect(updated.shortBreakDurationSeconds).toBe(300);

    /* Verificar evento */
    const lastEvent = events[events.length - 1] as { type: string };
    expect(lastEvent.type).toBe('pomodoro.settings.updated');

    /* Restaurar */
    service.updateSettings({ focusDurationSeconds: 1500 });
  });

  it('inicia descanso largo después de 4 sesiones completadas', () => {
    /* Completar 3 sesiones de focus más */
    for (let i = 0; i < 3; i++) {
      service.start('focus');
      service.complete();
    }

    const session = service.startBreak();
    expect(session.mode).toBe('long_break');
    expect(session.durationSeconds).toBe(900);
  });

  it('calcula remainingSeconds por endsAt', () => {
    const session = service.start('focus');
    const current = service.getCurrent();
    expect(current.remainingSeconds).toBeGreaterThan(0);
    expect(current.remainingSeconds).toBeLessThanOrEqual(session.durationSeconds);
  });

  it('lanza error al pausar sin sesión activa', () => {
    service.cancel();
    expect(() => service.pause()).toThrow('No hay ninguna sesión activa para pausar');
  });
});
