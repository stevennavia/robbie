import type { RobbieState } from '@robbie/shared';
import { drawEyes } from './eyes';
import { getStateVisual } from './state-visuals';

const TWEEN_DURATION_MS = 180;

/**
 * Vista de Robbie: posee el canvas de los ojos, la etiqueta de estado
 * y el atributo data-state (que colorea el aro del botón vía CSS).
 */
export class RobbieView {
  private readonly root: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly stateLabel: HTMLElement;
  private readonly reducedMotion: boolean;
  private currentIntensity: number;
  private targetIntensity: number;
  private animationFrame: number | null = null;

  constructor(rootId: string, canvasId: string, stateLabelId: string) {
    const root = document.getElementById(rootId);
    const canvas = document.getElementById(canvasId);
    const stateLabel = document.getElementById(stateLabelId);
    if (!root || !(canvas instanceof HTMLCanvasElement) || !stateLabel) {
      throw new Error('No se encontraron los elementos de Robbie en el DOM.');
    }
    this.root = root;
    this.canvas = canvas;
    this.stateLabel = stateLabel;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const initial = getStateVisual('idle');
    this.currentIntensity = initial.eyeIntensity;
    this.targetIntensity = initial.eyeIntensity;

    // Redibuja los ojos cuando la pantalla cambia de tamaño.
    const observer = new ResizeObserver(() => {
      this.render();
    });
    observer.observe(this.canvas);

    this.render();
  }

  setState(state: RobbieState): void {
    const visual = getStateVisual(state);
    this.root.dataset.state = state;
    this.stateLabel.textContent = visual.label;
    this.targetIntensity = visual.eyeIntensity;

    if (this.reducedMotion) {
      this.currentIntensity = this.targetIntensity;
      this.render();
      return;
    }
    this.startTween();
  }

  /** Transición suave y corta del brillo de los ojos (nada complejo). */
  private startTween(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
    }
    const from = this.currentIntensity;
    const to = this.targetIntensity;
    const start = performance.now();

    const step = (now: number): void => {
      const progress = Math.min(1, (now - start) / TWEEN_DURATION_MS);
      this.currentIntensity = from + (to - from) * progress;
      this.render();
      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(step);
      } else {
        this.animationFrame = null;
      }
    };
    this.animationFrame = requestAnimationFrame(step);
  }

  private render(): void {
    drawEyes(this.canvas, { intensity: this.currentIntensity });
  }
}
