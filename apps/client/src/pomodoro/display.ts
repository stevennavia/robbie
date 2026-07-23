import { formatRemaining, type PomodoroStatus } from '@robbie/shared';

const TIMER_HIDE_CLASS = 'robbie-timer-hidden';

let overlay: HTMLElement | null = null;

export function initDisplay(): void {
  overlay = document.getElementById('robbie-display-overlay');
}

export function showTimer(remainingSeconds: number, mode: PomodoroStatus, status: PomodoroStatus): void {
  if (!overlay) return;
  overlay.classList.remove(TIMER_HIDE_CLASS);

  const time = formatRemaining(remainingSeconds);

  let label = '';
  if (status === 'paused') {
    label = 'PAUSA';
  } else if (mode === 'short_break' || mode === 'long_break') {
    label = 'BREAK';
  }

  overlay.innerHTML = label
    ? `<span class="robbie-timer-label">${label}</span><span class="robbie-timer-value">${time}</span>`
    : `<span class="robbie-timer-value">${time}</span>`;
}

export function hideTimer(): void {
  if (!overlay) return;
  overlay.classList.add(TIMER_HIDE_CLASS);
  overlay.innerHTML = '';
}

export function updateTimerFromSession(
  remainingSeconds: number,
  mode: PomodoroStatus,
  status: PomodoroStatus,
): void {
  if (status === 'ready' || status === 'completed' || status === 'cancelled') {
    hideTimer();
    return;
  }

  if (remainingSeconds <= 0) {
    hideTimer();
    return;
  }

  showTimer(remainingSeconds, mode, status);
}
