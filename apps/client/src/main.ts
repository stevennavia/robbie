import { type RobbieState, type WebSocketEvent } from '@robbie/shared';
import { RobbieConnection, type ConnectionStatus } from './connection';
import { RobbieView } from './robbie/robbie-view';
import { createDevPanel } from './ui/dev-panel';
import './styles/base.css';
import './styles/layout.css';
import './styles/robbie.css';
import './styles/tray.css';

const SERVER_WS_URL = 'ws://localhost:3001/ws';
const MODE_STORAGE_KEY = 'robbie.mode';

type SectionId = 'conversar' | 'enfoque' | 'capturar' | 'ajustes';
type Mode = 'full' | 'compact';

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

let currentState: RobbieState = 'idle';

/* ---------- Estado de Robbie ---------- */

const robbieView = new RobbieView('robbie', 'robbie-eyes', 'robot-state-label');

const devPanel = createDevPanel('dev-panel-grid', {
  onStateSelected: (state) => {
    applyState(state, true);
  },
});

function applyState(state: RobbieState, notify: boolean): void {
  const previousState = currentState;
  currentState = state;
  robbieView.setState(state);
  devPanel.setActiveState(state);
  if (notify) {
    connection.send({
      type: 'robbie.state.changed',
      payload: { state, previousState },
    });
  }
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
      break; // El indicador de conexión ya refleja el estado.
    case 'robbie.state.changed':
      applyState(event.payload.state, false);
      break;
    case 'system.error':
      console.warn(`[robbie] Error del servidor: ${event.payload.error.message}`);
      break;
  }
}

const connection = new RobbieConnection(SERVER_WS_URL, {
  onStatusChange: renderConnectionStatus,
  onEvent: handleServerEvent,
});

/* ---------- Navegación entre secciones ---------- */

function showSection(section: SectionId): void {
  const content = SECTION_CONTENT[section];
  const container = requireElement<HTMLElement>('#section-content');
  container.replaceChildren();

  const heading = document.createElement('h2');
  heading.textContent = content.title;
  const paragraph = document.createElement('p');
  paragraph.textContent = content.description;
  container.append(heading, paragraph);

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
  const fromUrl = new URLSearchParams(window.location.search).get('mode');
  if (fromUrl === 'compact' || fromUrl === 'full') {
    return fromUrl;
  }
  return window.localStorage.getItem(MODE_STORAGE_KEY) === 'compact' ? 'compact' : 'full';
}

function setMode(mode: Mode): void {
  requireElement<HTMLDivElement>('.app').dataset.mode = mode;
  const toggle = requireElement<HTMLButtonElement>('#mode-toggle');
  toggle.setAttribute('aria-pressed', String(mode === 'compact'));
  toggle.textContent = mode === 'compact' ? 'Modo completo' : 'Modo compacto';
  window.localStorage.setItem(MODE_STORAGE_KEY, mode);
}

function initModeToggle(): void {
  requireElement<HTMLButtonElement>('#mode-toggle').addEventListener('click', () => {
    const current = requireElement<HTMLDivElement>('.app').dataset.mode === 'compact' ? 'compact' : 'full';
    setMode(current === 'compact' ? 'full' : 'compact');
  });
}

/* ---------- Acción principal (temporal) ---------- */

function initPrimaryAction(): void {
  const hint = requireElement<HTMLParagraphElement>('#stage-hint');
  const reveal = (): void => {
    hint.hidden = false;
  };
  requireElement<HTMLButtonElement>('#primary-action').addEventListener('click', reveal);
  requireElement<HTMLButtonElement>('#robbie-button').addEventListener('click', reveal);
}

/* ---------- Arranque ---------- */

initNavigation();
initModeToggle();
initPrimaryAction();
showSection('conversar');
setMode(initialMode());
applyState('idle', false);
connection.connect();
