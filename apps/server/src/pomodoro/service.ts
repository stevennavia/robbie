import { getDb, saveDb } from './db.js';
import type {
  PomodoroSession,
  PomodoroSettings,
  PomodoroStatus,
} from '@robbie/shared';

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

export type EventCallback = (event: PomodoroEvent) => void;

interface SessionRow {
  id: number;
  mode: string;
  duration_seconds: number;
  started_at: string | null;
  ends_at: string | null;
  paused_at: string | null;
  remaining_seconds: number;
  completed_sessions: number;
  status: string;
}

function toSession(row: SessionRow): PomodoroSession {
  return {
    mode: row.mode as PomodoroStatus,
    durationSeconds: row.duration_seconds,
    startedAt: row.started_at,
    endsAt: row.ends_at,
    pausedAt: row.paused_at,
    remainingSeconds: Math.max(0, row.remaining_seconds),
    completedSessions: row.completed_sessions,
    status: row.status as PomodoroStatus,
  };
}

function queryOne<T>(sql: string, params?: unknown[]): T | undefined {
  const db = getDb();
  const stmt = db.prepare(sql);
  if (params) stmt.bind(params);
  const row: T | undefined = stmt.step() ? (stmt.getAsObject() as T) : undefined;
  stmt.free();
  return row;
}

function execute(sql: string, params?: unknown[]): void {
  const db = getDb();
  db.run(sql, params ?? []);
}

function insertAndGetId(sql: string, params: unknown[]): number {
  const db = getDb();
  db.run(sql, params);
  const result = db.exec('SELECT last_insert_rowid() as id');
  const value = result[0]?.values[0]?.[0];
  return typeof value === 'number' ? value : 0;
}

export class PomodoroTimerService {
  private onEvent: EventCallback;
  private checkInterval: ReturnType<typeof setInterval> | undefined;

  constructor(onEvent: EventCallback) {
    this.onEvent = onEvent;
    this.recover();
    this.startChecker();
  }

  private startChecker(): void {
    this.checkInterval = setInterval(() => {
      this.checkExpired();
    }, 2000);
  }

  stop(): void {
    if (this.checkInterval) clearInterval(this.checkInterval);
  }

  /* ---------- Recuperación al arrancar ---------- */

  private recover(): void {
    const row = queryOne<SessionRow>(
      `SELECT * FROM pomodoro_sessions
       WHERE status IN ('focus', 'paused', 'short_break', 'long_break')
       ORDER BY id DESC LIMIT 1`,
    );

    if (!row) return;

    if (row.status !== 'paused' && row.ends_at) {
      const endsMs = new Date(row.ends_at).getTime();
      if (Date.now() >= endsMs) {
        const now = new Date().toISOString();
        execute(
          `UPDATE pomodoro_sessions
           SET status = 'completed', remaining_seconds = 0, completed_at = ?, updated_at = ?
           WHERE id = ?`,
          [now, now, row.id],
        );
        saveDb();
        this.emit('pomodoro.completed', {
          mode: row.mode,
          completedSessions: row.completed_sessions,
        });
        return;
      }
    }

    if (row.status !== 'paused' && row.ends_at) {
      const remaining = Math.max(
        0,
        Math.round((new Date(row.ends_at).getTime() - Date.now()) / 1000),
      );
      row.remaining_seconds = remaining;
    }

    this.emit('pomodoro.started', {
      mode: row.mode,
      durationSeconds: row.duration_seconds,
      endsAt: row.ends_at,
    });
  }

  /* ---------- Verificador de expiración ---------- */

  private checkExpired(): void {
    const row = queryOne<SessionRow>(
      `SELECT * FROM pomodoro_sessions
       WHERE status IN ('focus', 'short_break', 'long_break')
       AND ends_at IS NOT NULL
       AND ends_at <= datetime('now')
       ORDER BY id DESC LIMIT 1`,
    );

    if (!row) return;

    const now = new Date().toISOString();
    const completedSessions =
      row.mode === 'focus' ? row.completed_sessions + 1 : row.completed_sessions;

    execute(
      `UPDATE pomodoro_sessions
       SET status = 'completed', remaining_seconds = 0, completed_sessions = ?,
           completed_at = ?, updated_at = ?
       WHERE id = ?`,
      [completedSessions, now, now, row.id],
    );
    saveDb();

    this.emit('pomodoro.completed', {
      mode: row.mode,
      completedSessions,
    });
  }

  /* ---------- Acciones ---------- */

  getCurrent(): PomodoroSession {
    const row = queryOne<SessionRow>(
      `SELECT * FROM pomodoro_sessions
       WHERE status IN ('focus', 'paused', 'short_break', 'long_break', 'completed')
       ORDER BY id DESC LIMIT 1`,
    );

    if (!row) return this.readySession();

    if (row.status === 'completed') return toSession(row);

    if (row.status !== 'paused' && row.ends_at) {
      const remaining = Math.max(
        0,
        Math.round((new Date(row.ends_at).getTime() - Date.now()) / 1000),
      );
      return { ...toSession(row), remainingSeconds: remaining };
    }

    return toSession(row);
  }

  private readySession(): PomodoroSession {
    return {
      mode: 'ready',
      durationSeconds: 0,
      startedAt: null,
      endsAt: null,
      pausedAt: null,
      remainingSeconds: 0,
      completedSessions: 0,
      status: 'ready',
    };
  }

  private cancelActiveSession(): void {
    const row = queryOne<SessionRow>(
      `SELECT * FROM pomodoro_sessions
       WHERE status IN ('focus', 'paused', 'short_break', 'long_break')
       ORDER BY id DESC LIMIT 1`,
    );

    if (!row) return;

    const now = new Date().toISOString();
    execute(
      `UPDATE pomodoro_sessions
       SET status = 'cancelled', remaining_seconds = 0, updated_at = ?
       WHERE id = ?`,
      [now, row.id],
    );
    saveDb();
  }

  start(mode: 'focus' | 'short_break' | 'long_break'): PomodoroSession {
    /* Cancelar cualquier sesión activa existente */
    this.cancelActiveSession();

    const settings = this.getSettingsRow();

    const durationSeconds =
      mode === 'focus'
        ? settings.focus_duration_seconds
        : mode === 'long_break'
          ? settings.long_break_duration_seconds
          : settings.short_break_duration_seconds;

    const now = new Date();
    const endsAt = new Date(now.getTime() + durationSeconds * 1000);
    const completedSessions = this.getCompletedSessionCount();

    const id = insertAndGetId(
      `INSERT INTO pomodoro_sessions (mode, duration_seconds, started_at, ends_at, remaining_seconds, completed_sessions, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        mode,
        durationSeconds,
        now.toISOString(),
        endsAt.toISOString(),
        durationSeconds,
        completedSessions,
        mode,
      ],
    );
    saveDb();

    const session = queryOne<SessionRow>(
      'SELECT * FROM pomodoro_sessions WHERE id = ?',
      [id],
    );

    this.emit('pomodoro.started', {
      mode,
      durationSeconds,
      endsAt: endsAt.toISOString(),
    });

    return toSession(session!);
  }

  pause(): PomodoroSession {
    const row = queryOne<SessionRow>(
      `SELECT * FROM pomodoro_sessions
       WHERE status IN ('focus', 'short_break', 'long_break')
       ORDER BY id DESC LIMIT 1`,
    );

    if (!row) throw new Error('No hay ninguna sesión activa para pausar');

    const now = new Date().toISOString();
    const remaining = row.ends_at
      ? Math.max(0, Math.round((new Date(row.ends_at).getTime() - Date.now()) / 1000))
      : row.remaining_seconds;

    execute(
      `UPDATE pomodoro_sessions
       SET status = 'paused', paused_at = ?, remaining_seconds = ?, updated_at = ?
       WHERE id = ?`,
      [now, remaining, now, row.id],
    );
    saveDb();

    const updated = queryOne<SessionRow>(
      'SELECT * FROM pomodoro_sessions WHERE id = ?',
      [row.id],
    );

    this.emit('pomodoro.paused', { remainingSeconds: remaining });

    return toSession(updated!);
  }

  resume(): PomodoroSession {
    const row = queryOne<SessionRow>(
      `SELECT * FROM pomodoro_sessions
       WHERE status = 'paused' ORDER BY id DESC LIMIT 1`,
    );

    if (!row) throw new Error('No hay ninguna sesión pausada');

    const now = new Date();
    const endsAt = new Date(now.getTime() + row.remaining_seconds * 1000);
    const previousMode = row.mode as PomodoroStatus;

    execute(
      `UPDATE pomodoro_sessions
       SET status = ?, ends_at = ?, paused_at = NULL, updated_at = ?
       WHERE id = ?`,
      [previousMode, endsAt.toISOString(), now.toISOString(), row.id],
    );
    saveDb();

    const updated = queryOne<SessionRow>(
      'SELECT * FROM pomodoro_sessions WHERE id = ?',
      [row.id],
    );

    this.emit('pomodoro.resumed', { endsAt: endsAt.toISOString() });

    return toSession(updated!);
  }

  cancel(): PomodoroSession {
    const row = queryOne<SessionRow>(
      `SELECT * FROM pomodoro_sessions
       WHERE status IN ('focus', 'paused', 'short_break', 'long_break')
       ORDER BY id DESC LIMIT 1`,
    );

    if (!row) throw new Error('No hay ninguna sesión activa para cancelar');

    const now = new Date().toISOString();

    execute(
      `UPDATE pomodoro_sessions
       SET status = 'cancelled', remaining_seconds = 0, updated_at = ?
       WHERE id = ?`,
      [now, row.id],
    );
    saveDb();

    this.emit('pomodoro.cancelled', {});

    return this.readySession();
  }

  skipBreak(): PomodoroSession {
    const row = queryOne<SessionRow>(
      `SELECT * FROM pomodoro_sessions
       WHERE status IN ('short_break', 'long_break')
       ORDER BY id DESC LIMIT 1`,
    );

    if (!row) throw new Error('No hay ningún descanso activo para omitir');

    const now = new Date().toISOString();

    execute(
      `UPDATE pomodoro_sessions
       SET status = 'completed', remaining_seconds = 0, completed_at = ?, updated_at = ?
       WHERE id = ?`,
      [now, now, row.id],
    );
    saveDb();

    this.emit('pomodoro.completed', {
      mode: row.mode,
      completedSessions: row.completed_sessions,
    });

    return this.readySession();
  }

  complete(): PomodoroSession {
    const row = queryOne<SessionRow>(
      `SELECT * FROM pomodoro_sessions
       WHERE status IN ('focus', 'short_break', 'long_break')
       ORDER BY id DESC LIMIT 1`,
    );

    if (!row) throw new Error('No hay ninguna sesión activa para completar');

    const now = new Date().toISOString();
    const completedSessions =
      row.mode === 'focus' ? row.completed_sessions + 1 : row.completed_sessions;

    execute(
      `UPDATE pomodoro_sessions
       SET status = 'completed', remaining_seconds = 0, completed_sessions = ?,
           completed_at = ?, updated_at = ?
       WHERE id = ?`,
      [completedSessions, now, now, row.id],
    );
    saveDb();

    this.emit('pomodoro.completed', {
      mode: row.mode,
      completedSessions,
    });

    const updated = queryOne<SessionRow>(
      'SELECT * FROM pomodoro_sessions WHERE id = ?',
      [row.id],
    );

    return toSession(updated!);
  }

  getSettings(): PomodoroSettings {
    const row = this.getSettingsRow();
    return {
      focusDurationSeconds: row.focus_duration_seconds,
      shortBreakDurationSeconds: row.short_break_duration_seconds,
      longBreakDurationSeconds: row.long_break_duration_seconds,
      longBreakInterval: row.long_break_interval,
      soundEnabled: Boolean(row.sound_enabled),
      notificationsEnabled: Boolean(row.notifications_enabled),
    };
  }

  updateSettings(partial: Partial<PomodoroSettings>): PomodoroSettings {
    const current = this.getSettingsRow();

    const focus = partial.focusDurationSeconds ?? current.focus_duration_seconds;
    const short = partial.shortBreakDurationSeconds ?? current.short_break_duration_seconds;
    const long = partial.longBreakDurationSeconds ?? current.long_break_duration_seconds;
    const interval = partial.longBreakInterval ?? current.long_break_interval;
    const sound = partial.soundEnabled !== undefined ? (partial.soundEnabled ? 1 : 0) : current.sound_enabled;
    const notif =
      partial.notificationsEnabled !== undefined
        ? (partial.notificationsEnabled ? 1 : 0)
        : current.notifications_enabled;

    const now = new Date().toISOString();

    execute(
      `UPDATE pomodoro_settings
       SET focus_duration_seconds = ?, short_break_duration_seconds = ?,
           long_break_duration_seconds = ?, long_break_interval = ?,
           sound_enabled = ?, notifications_enabled = ?, updated_at = ?
       WHERE id = 1`,
      [focus, short, long, interval, sound, notif, now],
    );
    saveDb();

    const settings = this.getSettings();

    this.emit('pomodoro.settings.updated', { settings });

    return settings;
  }

  startBreak(): PomodoroSession {
    const settings = this.getSettingsRow();

    const focusCount = queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM pomodoro_sessions
       WHERE mode = 'focus' AND status = 'completed'`,
    );

    const count = focusCount?.count ?? 0;
    const isLongBreak = count > 0 && count % settings.long_break_interval === 0;

    return this.start(isLongBreak ? 'long_break' : 'short_break');
  }

  /* ---------- Privados ---------- */

  private getSettingsRow() {
    return queryOne<{
      focus_duration_seconds: number;
      short_break_duration_seconds: number;
      long_break_duration_seconds: number;
      long_break_interval: number;
      sound_enabled: number;
      notifications_enabled: number;
    }>('SELECT * FROM pomodoro_settings WHERE id = 1')!;
  }

  private getCompletedSessionCount(): number {
    const row = queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM pomodoro_sessions
       WHERE mode = 'focus' AND status = 'completed'`,
    );
    return row?.count ?? 0;
  }

  private emit(type: PomodoroEventType, payload: Record<string, unknown>): void {
    this.onEvent({ type, payload });
  }
}
