import { ROBBIE_STATES, ROBBIE_STATE_LABELS, type RobbieState } from '@robbie/shared';

export interface DevPanelCallbacks {
  onStateSelected(state: RobbieState): void;
}

export interface DevPanel {
  setActiveState(state: RobbieState): void;
}

/**
 * Panel temporal de desarrollo: una rejilla con los diez estados de
 * Robbie para probar su representación visual de la Fase 2.
 */
export function createDevPanel(containerId: string, callbacks: DevPanelCallbacks): DevPanel {
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Elemento no encontrado en el DOM: #${containerId}`);
  }

  const buttons = new Map<RobbieState, HTMLButtonElement>();

  for (const state of ROBBIE_STATES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'dev-state';
    button.textContent = ROBBIE_STATE_LABELS[state];
    button.dataset.state = state;
    button.setAttribute('aria-pressed', String(state === 'idle'));
    button.addEventListener('click', () => {
      callbacks.onStateSelected(state);
    });
    buttons.set(state, button);
    container.append(button);
  }

  return {
    setActiveState(state: RobbieState): void {
      for (const [buttonState, button] of buttons) {
        button.setAttribute('aria-pressed', String(buttonState === state));
      }
    },
  };
}
