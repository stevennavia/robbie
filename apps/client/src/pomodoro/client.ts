import {
  type PomodoroStatus,
  type PomodoroSession,
  type PomodoroSettings,
  pomodoroToRobbieState,
} from '@robbie/shared';
import {
  fetchCurrentSession,
  fetchSettings,
  startFocus,
  pauseSession,
  resumeSession,
  cancelSession,
  skipBreak,
  completeSession,
  updateSettings,
  startBreak,
  type PomodoroEvent,
} from './api.js';
import { updateTimerFromSession } from './display.js';

export interface PomodoroCallbacks {
  onRobbieState(state: string): void;
  onRobbieSuccess(): void;
  onSessionUpdate(session: PomodoroSession): void;
  onSettingsUpdate(settings: PomodoroSettings): void;
  onFocusStarted?: () => void;
  onError?: (message: string) => void;
}

const TICK_INTERVAL_MS = 1000;

export class PomodoroClient {
  private session: PomodoroSession = {
    mode: 'ready',
    durationSeconds: 0,
    startedAt: null,
    endsAt: null,
    pausedAt: null,
    remainingSeconds: 0,
    completedSessions: 0,
    status: 'ready',
  };

  private settings: PomodoroSettings | null = null;
  private tickTimer: ReturnType<typeof setInterval> | undefined;
  private callbacks: PomodoroCallbacks;
  private alertFired = false;
  private completedSessions = 0;

  constructor(callbacks: PomodoroCallbacks) {
    this.callbacks = callbacks;
  }

  getSession(): PomodoroSession {
    return this.session;
  }

  getSettings(): PomodoroSettings | null {
    return this.settings;
  }

  getCompletedSessions(): number {
    return this.completedSessions;
  }

  async refresh(): Promise<void> {
    try {
      const [session, settings] = await Promise.all([
        fetchCurrentSession(),
        fetchSettings(),
      ]);
      this.session = session;
      this.settings = settings;
      this.completedSessions = session.completedSessions;
      this.callbacks.onSessionUpdate(session);
      this.callbacks.onSettingsUpdate(settings);
      this.applyState(session);
      this.startTick();
    } catch (error) {
      console.warn('[pomodoro] Error al refrescar:', error);
      this.callbacks.onError?.('No se pudo conectar con el servidor de Pomodoro.');
    }
  }

  async start(): Promise<void> {
    try {
      const session = await startFocus();
      this.onSessionChange(session);
      if (session.mode === 'focus') this.callbacks.onFocusStarted?.();
    } catch (error) {
      console.warn('[pomodoro] Error al iniciar:', error);
      this.callbacks.onError?.('No se pudo iniciar el Pomodoro. Verifica que el servidor esté activo.');
    }
  }

  async pause(): Promise<void> {
    try {
      const session = await pauseSession();
      this.onSessionChange(session);
    } catch (error) {
      console.warn('[pomodoro] Error al pausar:', error);
      this.callbacks.onError?.('No se pudo pausar el Pomodoro.');
    }
  }

  async resume(): Promise<void> {
    try {
      const session = await resumeSession();
      this.onSessionChange(session);
    } catch (error) {
      console.warn('[pomodoro] Error al reanudar:', error);
      this.callbacks.onError?.('No se pudo reanudar el Pomodoro.');
    }
  }

  async cancel(): Promise<void> {
    try {
      const session = await cancelSession();
      this.onSessionChange(session);
    } catch (error) {
      console.warn('[pomodoro] Error al cancelar:', error);
      this.callbacks.onError?.('No se pudo cancelar el Pomodoro.');
    }
  }

  async skip(): Promise<void> {
    try {
      const session = await skipBreak();
      this.onSessionChange(session);
    } catch (error) {
      console.warn('[pomodoro] Error al omitir:', error);
    }
  }

  async complete(): Promise<void> {
    try {
      const session = await completeSession();
      this.onSessionChange(session);
    } catch (error) {
      console.warn('[pomodoro] Error al completar:', error);
    }
  }

  async startBreak(): Promise<void> {
    try {
      const session = await startBreak();
      this.onSessionChange(session);
    } catch (error) {
      console.warn('[pomodoro] Error al iniciar descanso:', error);
    }
  }

  async updateSettings(partial: Partial<PomodoroSettings>): Promise<void> {
    try {
      const settings = await updateSettings(partial);
      this.settings = settings;
      this.callbacks.onSettingsUpdate(settings);
    } catch (error) {
      console.warn('[pomodoro] Error al actualizar configuración:', error);
    }
  }

  handleWebSocketEvent(event: PomodoroEvent): void {
    switch (event.type) {
      case 'pomodoro.started':
        this.alertFired = false;
        if (event.payload.mode === 'focus') this.callbacks.onFocusStarted?.();
        this.refresh();
        break;
      case 'pomodoro.paused':
        this.session = { ...this.session, status: 'paused', remainingSeconds: event.payload.remainingSeconds as number };
        this.applyState(this.session);
        this.callbacks.onSessionUpdate(this.session);
        break;
      case 'pomodoro.resumed':
        this.session = {
          ...this.session,
          status: this.session.mode,
          endsAt: event.payload.endsAt as string,
        };
        this.applyState(this.session);
        this.callbacks.onSessionUpdate(this.session);
        this.startTick();
        break;
      case 'pomodoro.completed':
        this.onCompleted(event.payload.mode as string, event.payload.completedSessions as number);
        break;
      case 'pomodoro.cancelled':
        this.session = {
          mode: 'ready',
          durationSeconds: 0,
          startedAt: null,
          endsAt: null,
          pausedAt: null,
          remainingSeconds: 0,
          completedSessions: this.completedSessions,
          status: 'cancelled',
        };
        this.onSessionChange(this.session);
        break;
      case 'pomodoro.settings.updated':
        this.settings = event.payload.settings as PomodoroSettings;
        this.callbacks.onSettingsUpdate(this.settings);
        break;
    }
  }

  destroy(): void {
    this.stopTick();
  }

  /* ---------- Privados ---------- */

  private onSessionChange(session: PomodoroSession): void {
    this.session = session;
    this.completedSessions = session.completedSessions;
    this.applyState(session);
    this.callbacks.onSessionUpdate(session);
    if (session.status !== 'paused') this.startTick();
    else this.stopTick();
  }

  private onCompleted(mode: string, completedSessions: number): void {
    this.completedSessions = mode === 'focus' ? completedSessions : this.completedSessions;
    this.stopTick();

    this.session = {
      ...this.session,
      status: 'completed',
      remainingSeconds: 0,
      completedSessions: this.completedSessions,
    };
    this.callbacks.onSessionUpdate(this.session);
    updateTimerFromSession(0, this.session.mode, 'completed');

    if (!this.alertFired) {
      this.alertFired = true;
      this.callbacks.onRobbieSuccess();
    }
  }

  private applyState(session: PomodoroSession): void {
    const robbieState = pomodoroToRobbieState(session.status);
    this.callbacks.onRobbieState(robbieState);
    const displayStatus = session.status === 'paused' ? 'paused' : session.status;
    updateTimerFromSession(session.remainingSeconds, session.mode, displayStatus as PomodoroStatus);
  }

  private startTick(): void {
    this.stopTick();
    if (!this.session.endsAt) return;
    if (this.session.status === 'completed' || this.session.status === 'cancelled') return;

    this.tickTimer = setInterval(() => {
      this.tick();
    }, TICK_INTERVAL_MS);
  }

  private stopTick(): void {
    if (this.tickTimer !== undefined) {
      clearInterval(this.tickTimer);
      this.tickTimer = undefined;
    }
  }

  private tick(): void {
    if (!this.session.endsAt || this.session.status === 'paused') return;

    const endsMs = new Date(this.session.endsAt).getTime();
    const remaining = Math.max(0, Math.round((endsMs - Date.now()) / 1000));

    this.session = { ...this.session, remainingSeconds: remaining };
    this.callbacks.onSessionUpdate(this.session);

    const displayStatus = this.session.status as PomodoroStatus;
    updateTimerFromSession(remaining, this.session.mode, displayStatus);
  }
}
