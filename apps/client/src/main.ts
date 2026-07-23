import { ROBBIE_STATE_LABELS, type RobbieState, type WebSocketEvent, type PomodoroSession, type PomodoroSettings } from '@robbie/shared';
import { RobbieConnection, type ConnectionStatus } from './connection';
import { createRobbie } from './robbie';
import { ConversationSimulation } from './conversation';
import {
  getWindowMode,
  getRobbieWindowPosition,
  isTauriRuntime,
  minimizeCurrentWindow,
  moveRobbieWindow,
  publishPinnedRequest,
  publishPinnedState,
  publishRobbieReady,
  publishRobbieState,
  publishStateRequest,
  showRobbieWindow,
  setRobbieSizeMode,
  subscribeToRobbieButton,
  subscribeToRobbieReady,
  subscribeToRobbieState,
  subscribeToStateRequest,
  subscribeToPinnedRequest,
  subscribeToPinnedState,
  type RobbieWindowMode,
  type RobbieSizeMode,
} from './tauri-bridge';
import { createDevPanel } from './ui/dev-panel';
import { PomodoroClient, type PomodoroCallbacks } from './pomodoro/client';
import { initDisplay } from './pomodoro/display';
import { buildEnfoqueSection, setEnfoqueError, updateEnfoqueUI } from './pomodoro/enfoque-ui';
import type { PomodoroEvent } from './pomodoro/api';
import './styles/base.css';
import './styles/layout.css';
import './styles/robbie.css';
import './styles/tray.css';

const SERVER_WS_URL = 'ws://localhost:3001/ws';
const MODE_STORAGE_KEY = 'robbie.mode';

type SectionId = 'conversar' | 'enfoque' | 'capturar' | 'ajustes';
type Mode = 'full' | 'compact';

const windowMode: RobbieWindowMode = getWindowMode();
const isRobbieWindow = windowMode === 'robbie';
const isDashboardWindow = windowMode === 'dashboard';
document.querySelector<HTMLElement>('.app')?.setAttribute('data-window', windowMode);

const SECTION_CONTENT: Record<SectionId, { title: string; description: string }> = {
  conversar: {
    title: 'Conversar',
    description: 'Aquí podrás hablar con Robbie. La conversación con inteligencia artificial llegará en una fase futura.',
  },
  enfoque: {
    title: 'Enfoque',
    description: 'Aquí vivirá el temporizador de enfoque. Disponible en una fase futura.',
  },
  capturar: {
    title: 'Capturar',
    description: 'Aquí podrás capturar notas, tareas y recordatorios. Disponible en una fase futura.',
  },
  ajustes: {
    title: 'Ajustes',
    description: 'Aquí podrás configurar a Robbie. Disponible en una fase futura.',
  },
};

const STATUS_TEXT: Record<ConnectionStatus, string> = {
  connecting: 'Conectando…',
  connected: 'Servidor conectado',
  disconnected: 'Servidor desconectado',
};

function requireElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Elemento no encontrado en el DOM: ${selector}`);
  }
  return element;
}

/* ---------- Expresiones de Robbie ----------
 *
 * Estados funcionales y su expresión visual actual:
 *   idle     → reposo, parpadeo espontáneo y miradas
 *   thinking → ojos entrecerrados, mirando arriba, partículas "• • •"
 *   speaking → ojos achatados, animación de habla
 *   success  → expresión feliz con dos arcos
 *   error    → ojos como X (líneas rosadas cruzadas)
 *   offline  → ojos atenuados, línea horizontal
 *
 * Los estados listening, focus, paused, alert también tienen
 * expresión CSS definida pero no son parte del mapeo mínimo.
 *
 * setRobbieState es la única función para cambiar el estado
 * visual de Robbie. Conecta: controller → view → CSS.
 */

let currentState: RobbieState = 'idle';
let robbiePinned = false;
let pomodoroClient: PomodoroClient | null = null;

const robbie = createRobbie({
  container: requireElement<HTMLElement>('#robbie-eyes-root'),
  state: 'idle',
  autoStartPersonality: true,
});

const stateLabel = requireElement<HTMLElement>('#robot-state-label');
const updateStateLabel = (state: RobbieState): void => {
  stateLabel.textContent = ROBBIE_STATE_LABELS[state];
};

robbie.on('statechange', (event) => {
  const detail = (event as CustomEvent<{ state: RobbieState }>).detail;
  if (detail) updateStateLabel(detail.state);
});

const devPanel = createDevPanel('dev-panel-grid', {
  onStateSelected: (state) => {
    conversation?.cancel();
    setRobbieState(state, true);
  },
});

function setRobbieState(state: RobbieState, notify: boolean, broadcast = notify): void {
  const previousState = currentState;
  currentState = state;
  robbie.setState(state);
  updateStateLabel(state);
  devPanel.setActiveState(state);
  if (notify) {
    connection.send({
      type: 'robbie.state.changed',
      payload: { state, previousState },
    });
  }
  if (broadcast) void publishRobbieState(state);
}

const conversation = new ConversationSimulation((state) => {
  setRobbieState(state, false, true);
});

function startConversation(): void {
  if (conversation.isActive) return;
  conversation.start();
}

/* ---------- Conexión ---------- */

function renderConnectionStatus(status: ConnectionStatus): void {
  const statusElement = requireElement<HTMLDivElement>('#connection-status');
  statusElement.dataset.status = status;
  const text = statusElement.querySelector('.connection-text');
  if (text) {
    text.textContent = STATUS_TEXT[status];
  }
}

function handleServerEvent(event: WebSocketEvent): void {
  switch (event.type) {
    case 'connection.ready':
      if (pomodoroClient) void pomodoroClient.refresh();
      break;
    case 'robbie.state.changed':
      conversation?.cancel();
      setRobbieState(event.payload.state, false, true);
      break;
    case 'system.error':
      console.warn(`[robbie] Error del servidor: ${event.payload.error.message}`);
      break;
    default: {
      const pomodoroType = event.type as PomodoroEvent['type'];
      if (pomodoroType.startsWith('pomodoro.') && pomodoroClient) {
        pomodoroClient.handleWebSocketEvent(event as unknown as PomodoroEvent);
      }
      break;
    }
  }
}

const connection = new RobbieConnection(SERVER_WS_URL, {
  onStatusChange: renderConnectionStatus,
  onEvent: handleServerEvent,
});

/* ---------- Navegación entre secciones ---------- */

function showSection(section: SectionId): void {
  const container = requireElement<HTMLElement>('#section-content');
  container.replaceChildren();

  if (section === 'enfoque' && pomodoroClient) {
    const client = pomodoroClient;
    const session = client.getSession();
    const settings = client.getSettings();
    const ui = buildEnfoqueSection(session, settings, {
      onStart: () => client.start(),
      onPause: () => client.pause(),
      onResume: () => client.resume(),
      onCancel: () => client.cancel(),
      onSkip: () => client.skip(),
      onStartBreak: () => client.startBreak(),
      onUpdateSettings: (partial) => client.updateSettings(partial),
    });
    container.append(ui);
  } else {
    const content = SECTION_CONTENT[section];
    const heading = document.createElement('h2');
    heading.textContent = content.title;
    const paragraph = document.createElement('p');
    paragraph.textContent = content.description;
    container.append(heading, paragraph);
  }

  for (const button of document.querySelectorAll<HTMLButtonElement>('.nav-button')) {
    if (button.dataset.section === section) {
      button.setAttribute('aria-current', 'page');
    } else {
      button.removeAttribute('aria-current');
    }
  }
}

function initNavigation(): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>('.nav-button')) {
    button.addEventListener('click', () => {
      const section = button.dataset.section;
      if (section === 'conversar' || section === 'enfoque' || section === 'capturar' || section === 'ajustes') {
        showSection(section);
      }
    });
  }
}

/* ---------- Modo completo / compacto ---------- */

function initialMode(): Mode {
  if (isDashboardWindow) return 'full';
  const fromUrl = new URLSearchParams(window.location.search).get('mode');
  if (fromUrl === 'compact' || fromUrl === 'full') {
    return fromUrl;
  }
  return window.localStorage.getItem(MODE_STORAGE_KEY) === 'compact' ? 'compact' : 'full';
}

function setMode(mode: Mode): void {
  const effectiveMode = isDashboardWindow ? 'full' : mode;
  requireElement<HTMLDivElement>('.app').dataset.mode = effectiveMode;
  const toggle = requireElement<HTMLButtonElement>('#mode-toggle');
  toggle.setAttribute('aria-pressed', String(effectiveMode === 'compact'));
  toggle.textContent = effectiveMode === 'compact' ? 'Modo completo' : 'Modo compacto';
  if (!isDashboardWindow) window.localStorage.setItem(MODE_STORAGE_KEY, effectiveMode);
}

function initModeToggle(): void {
  const toggle = requireElement<HTMLButtonElement>('#mode-toggle');
  if (isDashboardWindow) {
    toggle.hidden = true;
    return;
  }
  toggle.addEventListener('click', () => {
    const current = requireElement<HTMLDivElement>('.app').dataset.mode === 'compact' ? 'compact' : 'full';
    setMode(current === 'compact' ? 'full' : 'compact');
  });
}

/* ---------- Acción principal (temporal) ---------- */

function revealPrimaryHint(): void {
  requireElement<HTMLParagraphElement>('#stage-hint').hidden = false;
}

function initPrimaryAction(): void {
  requireElement<HTMLButtonElement>('#primary-action').addEventListener('click', () => {
    startConversation();
    revealPrimaryHint();
  });

  if (!isRobbieWindow) {
    requireElement<HTMLElement>('.robbie-shell').addEventListener('click', () => {
      startConversation();
      revealPrimaryHint();
    });
  }
}

function initShowRobbie(): void {
  const button = requireElement<HTMLButtonElement>('#show-robbie');
  button.addEventListener('click', () => {
    if (!isTauriRuntime()) return;
    void showRobbieWindow()
      .then(() => {
        button.textContent = 'Robbie visible';
      })
      .catch((error: unknown) => {
        console.warn('[robbie] No se pudo mostrar la ventana:', error);
      });
  });
}

function initSizeModeToggle(): void {
  const button = requireElement<HTMLButtonElement>('#size-mode-toggle');
  if (!isDashboardWindow || !isTauriRuntime()) {
    button.hidden = true;
    return;
  }

  let mode: RobbieSizeMode = 'compact';
  const render = (): void => {
    const hardware = mode === 'hardware';
    button.setAttribute('aria-pressed', String(hardware));
    button.textContent = hardware ? 'Modo compacto' : 'Modo hardware';
  };

  render();
  button.addEventListener('click', () => {
    const nextMode: RobbieSizeMode = mode === 'hardware' ? 'compact' : 'hardware';
    button.disabled = true;
    void setRobbieSizeMode(nextMode)
      .then(() => {
        mode = nextMode;
        render();
      })
      .catch((error: unknown) => {
        console.warn('[robbie] No se pudo cambiar el tamaño:', error);
      })
      .finally(() => {
        button.disabled = false;
      });
  });
}

function initTauriWindows(): void {
  const stateSubscription = subscribeToRobbieState((state, source) => {
    if (source === windowMode) return;
    if (state !== currentState) {
      conversation?.cancel();
      setRobbieState(state, false, false);
    }
  });

  if (isRobbieWindow) {
    void stateSubscription.then(() => {
      void publishRobbieReady();
      void publishStateRequest();
    });
    return;
  }

  void Promise.all([
    stateSubscription,
    subscribeToRobbieButton(() => {
      startConversation();
      revealPrimaryHint();
    }),
    subscribeToRobbieReady(() => publishRobbieState(currentState)),
    subscribeToStateRequest(() => publishRobbieState(currentState)),
  ]);
}

/* ---------- Fijar ventana Robbie (siempre al frente) ---------- */

function initPinToggle(): void {
  const applyPinnedState = (pinned: boolean): void => {
    robbiePinned = pinned;
    document.querySelector<HTMLElement>('.app')?.setAttribute('data-pinned', String(pinned));
    if (isRobbieWindow) return;
    const pinBtn = requireElement<HTMLButtonElement>('#pin-toggle');
    pinBtn.dataset.pinned = String(pinned);
    pinBtn.setAttribute('aria-pressed', String(pinned));
    pinBtn.textContent = pinned ? 'Fijado' : 'No fijado';
  };

  if (!isTauriRuntime()) return;

  if (isRobbieWindow) {
    void subscribeToPinnedState(applyPinnedState).then(() => publishPinnedRequest());
    return;
  }

  const pinBtn = requireElement<HTMLButtonElement>('#pin-toggle');
  pinBtn.hidden = false;
  applyPinnedState(false);
  void subscribeToPinnedRequest(() => publishPinnedState(robbiePinned));
  void subscribeToPinnedState(applyPinnedState);

  pinBtn.addEventListener('click', () => {
    applyPinnedState(!robbiePinned);
    void publishPinnedState(robbiePinned);
  });
}

/* ---------- Cara feliz al arrastrar ventana Robbie ---------- */

function initDragHappy(): void {
  if (!isRobbieWindow) return;

  const casing = document.querySelector<HTMLElement>('.robbie__casing');
  const robbieElement = document.querySelector<HTMLElement>('.robbie');
  if (!casing || !robbieElement) return;

  let dragPrevState: RobbieState = 'idle';
  let isPressed = false;
  let isDragging = false;
  let mouseStartX = 0;
  let mouseStartY = 0;
  let mouseStartScreenX = 0;
  let mouseStartScreenY = 0;
  let windowStartPosition: Promise<{ x: number; y: number } | undefined> | undefined;

  const clearDrag = (): void => {
    isPressed = false;
    isDragging = false;
    delete robbieElement.dataset.gesture;
  };

  casing.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || isPressed) return;
    isPressed = true;
    mouseStartX = e.clientX;
    mouseStartY = e.clientY;
    mouseStartScreenX = e.screenX;
    mouseStartScreenY = e.screenY;
    isDragging = false;
    dragPrevState = currentState;
    windowStartPosition = !robbiePinned ? getRobbieWindowPosition() : undefined;
  });

  const moveDrag = (e: MouseEvent): void => {
    if (!isPressed || robbiePinned) return;
    if (!isDragging) {
      const distance = Math.hypot(e.clientX - mouseStartX, e.clientY - mouseStartY);
      if (distance < 6) return;
      isDragging = true;
      robbieElement.dataset.gesture = 'happy';
    }
    void moveWindow(e);
  };

  const moveWindow = async (e: MouseEvent): Promise<void> => {
    const startPosition = await windowStartPosition;
    if (!startPosition || !isPressed || !isDragging || robbiePinned) return;
    const scale = window.devicePixelRatio || 1;
    await moveRobbieWindow({
      x: startPosition.x + (e.screenX - mouseStartScreenX) * scale,
      y: startPosition.y + (e.screenY - mouseStartScreenY) * scale,
    });
  };

  window.addEventListener('mousemove', moveDrag);

  const endDrag = (): void => {
    if (!isPressed) return;
    const shouldStartConversation = !isDragging;
    const previousState = dragPrevState;
    clearDrag();
    windowStartPosition = undefined;
    if (shouldStartConversation) {
      startConversation();
      revealPrimaryHint();
      return;
    }
    setRobbieState(previousState, false, false);
  };

  window.addEventListener('mouseup', endDrag);
  window.addEventListener('blur', clearDrag);
  casing.addEventListener('mouseleave', () => {
    if (!isPressed) clearDrag();
  });
}

/* ---------- Escalar Robbie al redimensionar ventana ---------- */

function initVisualScale(): void {
  if (!isRobbieWindow) return;

  const visual = document.querySelector<HTMLElement>('.robbie');
  if (!visual) return;

  const updateScale = (): void => {
    const hardware = window.innerWidth >= 200 || window.innerHeight >= 120;
    document.querySelector<HTMLElement>('.app')?.setAttribute('data-size-mode', hardware ? 'hardware' : 'compact');
    visual.style.setProperty('--robbie-scale', hardware ? '0.80' : '0.546');
  };

  updateScale();
  window.addEventListener('resize', updateScale);
}

/* ---------- Pomodoro ---------- */

let focusWindowTransitionRunning = false;

async function moveDashboardToRobbieFocus(): Promise<void> {
  if (focusWindowTransitionRunning) return;
  focusWindowTransitionRunning = true;
  try {
    await minimizeCurrentWindow();
    await showRobbieWindow();
  } catch (error) {
    console.warn('[pomodoro] No se pudo cambiar a Robbie de escritorio:', error);
  } finally {
    focusWindowTransitionRunning = false;
  }
}

function initPomodoro(): void {
  initDisplay();

  const callbacks: PomodoroCallbacks = {
    onRobbieState: (state) => {
      conversation?.cancel();
      setRobbieState(state as RobbieState, false, true);
    },
    onRobbieSuccess: () => {
      robbie.success();
    },
    onFocusStarted: () => {
      if (!isRobbieWindow && isTauriRuntime()) {
        void moveDashboardToRobbieFocus();
      }
    },
    onSessionUpdate: (session: PomodoroSession) => {
      setEnfoqueError(null);
      if (document.querySelector('.nav-button[data-section="enfoque"][aria-current="page"]')) {
        const pc = pomodoroClient;
        const settings = pc ? pc.getSettings() : null;
        updateEnfoqueUI(session, settings);
      }
    },
    onSettingsUpdate: (_settings: PomodoroSettings) => {
    },
    onError: (message) => setEnfoqueError(message),
  };

  pomodoroClient = new PomodoroClient(callbacks);
}

/* ---------- Menú contextual en Robbie escritorio ---------- */

async function initRobbiePomodoroMenu(): Promise<void> {
  const { Menu, MenuItem } = await import('@tauri-apps/api/menu');
  const startItem = await MenuItem.new({
    id: 'start-pomodoro',
    text: 'Iniciar Pomodoro',
    action: () => pomodoroClient?.start(),
  });
  const pauseItem = await MenuItem.new({
    id: 'pause-pomodoro',
    text: 'Pausar',
    action: () => pomodoroClient?.pause(),
  });
  const resumeItem = await MenuItem.new({
    id: 'resume-pomodoro',
    text: 'Reanudar',
    action: () => pomodoroClient?.resume(),
  });
  const cancelItem = await MenuItem.new({
    id: 'cancel-pomodoro',
    text: 'Cancelar',
    action: () => pomodoroClient?.cancel(),
  });
  const menu = await Menu.new({ items: [startItem, pauseItem, resumeItem, cancelItem] });

  window.addEventListener('contextmenu', async (e) => {
    e.preventDefault();
    const status = pomodoroClient?.getSession().status ?? 'ready';
    await startItem.setEnabled(status === 'ready' || status === 'completed' || status === 'cancelled');
    await pauseItem.setEnabled(status === 'focus' || status === 'short_break' || status === 'long_break');
    await resumeItem.setEnabled(status === 'paused');
    await cancelItem.setEnabled(['focus', 'paused', 'short_break', 'long_break'].includes(status));
    await menu.popup();
  });
}

/* ---------- Arranque ---------- */

initNavigation();
initModeToggle();
initPrimaryAction();
initShowRobbie();
initSizeModeToggle();
initTauriWindows();
initPinToggle();
initDragHappy();
initVisualScale();
initPomodoro();
if (isRobbieWindow && isTauriRuntime()) void initRobbiePomodoroMenu();
showSection('conversar');
setMode(initialMode());
setRobbieState('idle', false);
connection.connect();
void pomodoroClient!.refresh();
window.addEventListener('pagehide', () => {
  conversation.cancel();
  robbie.destroy();
}, { once: true });
