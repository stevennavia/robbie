import type { PomodoroSession, PomodoroSettings, UpdateSettingsPayload } from '@robbie/shared';

/** El WebView de Tauri no comparte el origen HTTP del servidor local. */
export const POMODORO_API_BASE = 'http://localhost:3001/api/pomodoro';

export type PomodoroEventType =
  | 'pomodoro.started'
  | 'pomodoro.paused'
  | 'pomodoro.resumed'
  | 'pomodoro.completed'
  | 'pomodoro.cancelled'
  | 'pomodoro.settings.updated';

export interface PomodoroEvent {
  type: PomodoroEventType;
  payload: Record<string, unknown>;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${POMODORO_API_BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${POMODORO_API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${POMODORO_API_BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

export function fetchCurrentSession(): Promise<PomodoroSession> {
  return get<PomodoroSession>('/current');
}

export function fetchSettings(): Promise<PomodoroSettings> {
  return get<PomodoroSettings>('/settings');
}

export function updateSettings(partial: UpdateSettingsPayload): Promise<PomodoroSettings> {
  return patch<PomodoroSettings>('/settings', partial);
}

export function startFocus(): Promise<PomodoroSession> {
  return post<PomodoroSession>('/start', { mode: 'focus' });
}

export function startShortBreak(): Promise<PomodoroSession> {
  return post<PomodoroSession>('/start', { mode: 'short_break' });
}

export function startLongBreak(): Promise<PomodoroSession> {
  return post<PomodoroSession>('/start', { mode: 'long_break' });
}

export function pauseSession(): Promise<PomodoroSession> {
  return post<PomodoroSession>('/pause');
}

export function resumeSession(): Promise<PomodoroSession> {
  return post<PomodoroSession>('/resume');
}

export function cancelSession(): Promise<PomodoroSession> {
  return post<PomodoroSession>('/cancel');
}

export function skipBreak(): Promise<PomodoroSession> {
  return post<PomodoroSession>('/skip');
}

export function completeSession(): Promise<PomodoroSession> {
  return post<PomodoroSession>('/complete');
}

export function startBreak(): Promise<PomodoroSession> {
  return post<PomodoroSession>('/start-break');
}
