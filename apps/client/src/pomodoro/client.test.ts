import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PomodoroSession } from '@robbie/shared';
import {
  cancelSession,
  completeSession,
  fetchCurrentSession,
  fetchSettings,
  pauseSession,
  resumeSession,
  startBreak,
  startFocus,
} from './api.js';
import { PomodoroClient } from './client';

vi.mock('./api.js', () => ({
  cancelSession: vi.fn(),
  completeSession: vi.fn(),
  fetchCurrentSession: vi.fn(),
  fetchSettings: vi.fn(),
  pauseSession: vi.fn(),
  resumeSession: vi.fn(),
  skipBreak: vi.fn(),
  startBreak: vi.fn(),
  startFocus: vi.fn(),
  updateSettings: vi.fn(),
}));

vi.mock('./display.js', () => ({
  updateTimerFromSession: vi.fn(),
}));

const settings = {
  focusDurationSeconds: 1500,
  shortBreakDurationSeconds: 300,
  longBreakDurationSeconds: 900,
  longBreakInterval: 4,
  soundEnabled: true,
  notificationsEnabled: false,
};

function session(overrides: Partial<PomodoroSession> = {}): PomodoroSession {
  return {
    mode: 'focus',
    durationSeconds: 1500,
    startedAt: '2026-07-23T12:00:00.000Z',
    endsAt: '2026-07-23T12:25:00.000Z',
    pausedAt: null,
    remainingSeconds: 1500,
    completedSessions: 0,
    status: 'focus',
    ...overrides,
  };
}

describe('PomodoroClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchCurrentSession).mockResolvedValue(session());
    vi.mocked(fetchSettings).mockResolvedValue(settings);
  });

  it('notifica el inicio de enfoque inmediatamente después del REST', async () => {
    const onFocusStarted = vi.fn();
    vi.mocked(startFocus).mockResolvedValue(session());
    const client = new PomodoroClient({
      onRobbieState: vi.fn(),
      onRobbieSuccess: vi.fn(),
      onSessionUpdate: vi.fn(),
      onSettingsUpdate: vi.fn(),
      onFocusStarted,
    });

    await client.start();

    expect(client.getSession().status).toBe('focus');
    expect(client.getSession().durationSeconds).toBe(1500);
    expect(onFocusStarted).toHaveBeenCalledTimes(1);
  });

  it('no dispara la transición de enfoque para descansos', async () => {
    const onFocusStarted = vi.fn();
    vi.mocked(startBreak).mockResolvedValue(session({
      mode: 'short_break',
      status: 'short_break',
      durationSeconds: 300,
      remainingSeconds: 300,
    }));
    const client = new PomodoroClient({
      onRobbieState: vi.fn(),
      onRobbieSuccess: vi.fn(),
      onSessionUpdate: vi.fn(),
      onSettingsUpdate: vi.fn(),
      onFocusStarted,
    });

    await client.startBreak();

    expect(client.getSession().status).toBe('short_break');
    expect(onFocusStarted).not.toHaveBeenCalled();
  });

  it('recupera enfoque desde WebSocket, pero ignora el evento de descanso', () => {
    const onFocusStarted = vi.fn();
    const client = new PomodoroClient({
      onRobbieState: vi.fn(),
      onRobbieSuccess: vi.fn(),
      onSessionUpdate: vi.fn(),
      onSettingsUpdate: vi.fn(),
      onFocusStarted,
    });

    client.handleWebSocketEvent({
      type: 'pomodoro.started',
      payload: { mode: 'focus', durationSeconds: 1500, endsAt: session().endsAt },
    });
    client.handleWebSocketEvent({
      type: 'pomodoro.started',
      payload: { mode: 'short_break', durationSeconds: 300, endsAt: session().endsAt },
    });

    expect(onFocusStarted).toHaveBeenCalledTimes(1);
  });

  it('actualiza pausa, reanudación, cancelación y completado', async () => {
    const onRobbieState = vi.fn();
    const onRobbieSuccess = vi.fn();
    const client = new PomodoroClient({
      onRobbieState,
      onRobbieSuccess,
      onSessionUpdate: vi.fn(),
      onSettingsUpdate: vi.fn(),
    });

    vi.mocked(pauseSession).mockResolvedValue(session({ status: 'paused', pausedAt: '2026-07-23T12:05:00.000Z', remainingSeconds: 1200 }));
    vi.mocked(resumeSession).mockResolvedValue(session({ remainingSeconds: 1200 }));
    vi.mocked(cancelSession).mockResolvedValue(session({ mode: 'ready', status: 'cancelled', durationSeconds: 0, endsAt: null, remainingSeconds: 0 }));
    vi.mocked(completeSession).mockResolvedValue(session({ status: 'completed', remainingSeconds: 0 }));

    await client.pause();
    expect(client.getSession().status).toBe('paused');
    await client.resume();
    expect(client.getSession().status).toBe('focus');
    await client.cancel();
    expect(client.getSession().status).toBe('cancelled');
    await client.complete();
    expect(client.getSession().status).toBe('completed');
    expect(onRobbieState).toHaveBeenCalledWith('paused');
    expect(onRobbieSuccess).not.toHaveBeenCalled();
  });
});
