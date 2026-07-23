import { POMODORO_STATUS_LABELS, formatRemaining, type PomodoroSession, type PomodoroSettings } from '@robbie/shared';

export interface EnfoqueCallbacks {
  onStart(): void;
  onPause(): void;
  onResume(): void;
  onCancel(): void;
  onSkip(): void;
  onStartBreak(): void;
  onUpdateSettings(partial: Partial<PomodoroSettings>): void;
}

function createButton(text: string, id: string, hidden = false): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = text;
  btn.id = id;
  btn.className = 'enfoque-btn';
  if (hidden) btn.hidden = true;
  return btn;
}

function createSelect(options: { value: number; label: string }[], current: number, onChange: (value: number) => void): HTMLElement {
  const container = document.createElement('label');
  container.className = 'enfoque-field';
  container.textContent = 'Duración: ';

  const select = document.createElement('select');
  select.className = 'enfoque-select';

  for (const opt of options) {
    const el = document.createElement('option');
    el.value = String(opt.value);
    el.textContent = opt.label;
    if (opt.value === current) el.selected = true;
    select.append(el);
  }

  select.addEventListener('change', () => {
    onChange(Number(select.value));
  });

  container.append(select);
  return container;
}

function createCheckbox(label: string, checked: boolean, onChange: (checked: boolean) => void): HTMLElement {
  const container = document.createElement('label');
  container.className = 'enfoque-field';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));

  container.append(input, ` ${label}`);
  return container;
}

function createProgressBar(current: number, total: number): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'enfoque-progress';

  const fill = document.createElement('div');
  fill.className = 'enfoque-progress-fill';
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  fill.style.width = `${pct}%`;

  bar.append(fill);
  return bar;
}

export function buildEnfoqueSection(
  session: PomodoroSession,
  settings: PomodoroSettings | null,
  callbacks: EnfoqueCallbacks,
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'enfoque-section';

  /* Tiempo restante grande */
  const timeDisplay = document.createElement('div');
  timeDisplay.className = 'enfoque-time';
  timeDisplay.id = 'enfoque-time';
  timeDisplay.textContent = formatRemaining(session.remainingSeconds);
  container.append(timeDisplay);

  /* Etiqueta de modo */
  const modeLabel = document.createElement('div');
  modeLabel.className = 'enfoque-mode';
  modeLabel.id = 'enfoque-mode';
  modeLabel.textContent = POMODORO_STATUS_LABELS[session.status];
  container.append(modeLabel);

  const errorMessage = document.createElement('p');
  errorMessage.className = 'enfoque-error';
  errorMessage.id = 'enfoque-error';
  errorMessage.hidden = true;
  errorMessage.setAttribute('role', 'alert');
  container.append(errorMessage);

  /* Progreso visual */
  const progressContainer = document.createElement('div');
  progressContainer.className = 'enfoque-progress-container';
  const progress = createProgressBar(
    session.durationSeconds > 0 ? session.durationSeconds - session.remainingSeconds : 0,
    session.durationSeconds || 1,
  );
  progressContainer.append(progress);
  container.append(progressContainer);

  /* Contador de sesiones */
  const sessionCount = document.createElement('div');
  sessionCount.className = 'enfoque-sessions';
  sessionCount.id = 'enfoque-sessions';
  const interval = settings?.longBreakInterval ?? 4;
  sessionCount.textContent = `Sesiones: ${session.completedSessions}/${interval}`;
  container.append(sessionCount);

  /* Botones */
  const actions = document.createElement('div');
  actions.className = 'enfoque-actions';

  const btnStart = createButton('Iniciar', 'enfoque-start');
  const btnPause = createButton('Pausar', 'enfoque-pause', true);
  const btnResume = createButton('Reanudar', 'enfoque-resume', true);
  const btnCancel = createButton('Cancelar', 'enfoque-cancel', true);
  const btnSkip = createButton('Omitir descanso', 'enfoque-skip', true);
  const btnStartBreak = createButton('Iniciar descanso', 'enfoque-start-break', true);

  btnStart.addEventListener('click', () => callbacks.onStart());
  btnPause.addEventListener('click', () => callbacks.onPause());
  btnResume.addEventListener('click', () => callbacks.onResume());
  btnCancel.addEventListener('click', () => callbacks.onCancel());
  btnSkip.addEventListener('click', () => callbacks.onSkip());
  btnStartBreak.addEventListener('click', () => callbacks.onStartBreak());

  actions.append(btnStart, btnPause, btnResume, btnCancel, btnSkip, btnStartBreak);
  container.append(actions);

  /* Selector de duración */
  const durationOptions = [
    { value: 900, label: '15 min' },
    { value: 1200, label: '20 min' },
    { value: 1500, label: '25 min' },
    { value: 1800, label: '30 min' },
    { value: 2700, label: '45 min' },
    { value: 3600, label: '60 min' },
  ];

  const currentDuration = settings?.focusDurationSeconds ?? 1500;
  const durationField = createSelect(durationOptions, currentDuration, (value) => {
    callbacks.onUpdateSettings({ focusDurationSeconds: value });
  });
  container.append(durationField);

  /* Silenciar alertas */
  const soundField = createCheckbox('Silenciar alertas', !(settings?.soundEnabled ?? true), (checked) => {
    callbacks.onUpdateSettings({ soundEnabled: !checked });
  });
  container.append(soundField);

  /* Notificaciones */
  const notifField = createCheckbox('Notificaciones del navegador', settings?.notificationsEnabled ?? false, (checked) => {
    callbacks.onUpdateSettings({ notificationsEnabled: checked });
  });
  container.append(notifField);

  return container;
}

export function updateEnfoqueUI(session: PomodoroSession, settings: PomodoroSettings | null): void {
  const timeEl = document.getElementById('enfoque-time');
  if (timeEl) timeEl.textContent = formatRemaining(session.remainingSeconds);

  const modeEl = document.getElementById('enfoque-mode');
  if (modeEl) modeEl.textContent = POMODORO_STATUS_LABELS[session.status];

  const sessionsEl = document.getElementById('enfoque-sessions');
  if (sessionsEl) {
    const interval = settings?.longBreakInterval ?? 4;
    sessionsEl.textContent = `Sesiones: ${session.completedSessions}/${interval}`;
  }

  /* Actualizar botones según estado */
  const show = (id: string, visible: boolean) => {
    const el = document.getElementById(id);
    if (el) el.hidden = !visible;
  };

  const status = session.status;

  show('enfoque-start', status === 'ready' || status === 'completed' || status === 'cancelled');
  show('enfoque-pause', status === 'focus' || status === 'short_break' || status === 'long_break');
  show('enfoque-resume', status === 'paused');
  show('enfoque-cancel', status === 'focus' || status === 'paused' || status === 'short_break' || status === 'long_break');
  show('enfoque-skip', status === 'short_break' || status === 'long_break');
  show('enfoque-start-break', status === 'completed');

  /* Progress bar */
  const progressFill = document.querySelector('.enfoque-progress-fill') as HTMLElement | null;
  if (progressFill && session.durationSeconds > 0) {
    const pct = Math.min(100, Math.round(((session.durationSeconds - session.remainingSeconds) / session.durationSeconds) * 100));
    progressFill.style.width = `${pct}%`;
  }
}

export function setEnfoqueError(message: string | null): void {
  const errorEl = document.getElementById('enfoque-error');
  if (!errorEl) return;
  errorEl.textContent = message ?? '';
  errorEl.hidden = !message;
}
