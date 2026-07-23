import { animateEffect, animateState } from './RobbieAnimations';
import type { RobbieState } from './types';

export class RobbieView {
  readonly root: HTMLDivElement;
  private readonly eyes: HTMLDivElement;
  private readonly effects: HTMLDivElement;
  private readonly particles: HTMLDivElement;
  private readonly animations = new Set<Animation>();
  private readonly timers = new Set<number>();
  private heartTimer: number | undefined;

  constructor(container: HTMLElement, className = '') {
    this.root = document.createElement('div');
    this.root.className = `robbie ${className}`.trim();
    this.root.dataset.state = 'idle';
    this.root.setAttribute('aria-hidden', 'true');

    this.effects = this.layer('robbie-effects');
    this.eyes = this.layer('robbie-eyes');
    this.eyes.append(this.eye('left'), this.eye('right'));
    this.particles = this.layer('robbie-particles');
    this.root.append(this.effects, this.eyes, this.particles);
    container.append(this.root);
  }

  setState(state: RobbieState): void {
    this.clearAnimations();
    this.clearHearts();
    this.root.dataset.state = state;
    const animation = animateState(this.root, state);
    if (animation) this.track(animation);
  }

  playEffect(name: 'success' | 'alert' | 'error'): void {
    this.clearAnimations();
    this.root.dataset.effect = name;
    const animation = animateEffect(this.root, name);
    if (animation) this.track(animation);
    const timer = window.setTimeout(() => {
      this.timers.delete(timer);
      if (this.root.dataset.effect === name) delete this.root.dataset.effect;
    }, 760);
    this.timers.add(timer);
  }

  playHearts(): void {
    this.clearHearts();
    this.root.dataset.hearts = 'true';
    const colors = ['#ff92d0', '#c39bff', '#ffb5e5', '#a990ff', '#f6d2ff'];
    for (let index = 0; index < 6; index += 1) {
      const heart = document.createElement('span');
      heart.className = 'robbie-heart';
      heart.textContent = '♥';
      heart.style.setProperty('--heart-x', `${-62 + index * 25 + (index % 2) * 8}px`);
      heart.style.setProperty('--heart-y', `${index % 2 === 0 ? 6 : -8}px`);
      heart.style.setProperty('--heart-delay', `${index * 55}ms`);
      heart.style.setProperty('--heart-color', colors[index % colors.length] ?? '#ff92d0');
      this.particles.append(heart);
    }
    this.heartTimer = window.setTimeout(() => {
      this.heartTimer = undefined;
      this.clearHearts();
    }, 1500);
  }

  setGesture(name: 'blink' | 'look-left' | 'look-right' | 'happy'): void { this.root.dataset.gesture = name; }
  clearGesture(): void { delete this.root.dataset.gesture; }

  destroy(): void {
    this.clearAnimations();
    if (this.heartTimer !== undefined) window.clearTimeout(this.heartTimer);
    this.heartTimer = undefined;
    this.timers.forEach((timer) => window.clearTimeout(timer));
    this.timers.clear();
    this.root.remove();
  }

  private clearHearts(): void {
    if (this.heartTimer !== undefined) window.clearTimeout(this.heartTimer);
    this.heartTimer = undefined;
    delete this.root.dataset.hearts;
    this.particles.querySelectorAll('.robbie-heart').forEach((heart) => heart.remove());
  }

  private layer(className: string): HTMLDivElement {
    const element = document.createElement('div');
    element.className = className;
    return element;
  }

  private eye(side: 'left' | 'right'): HTMLDivElement {
    const element = document.createElement('div');
    element.className = `robbie-eye robbie-eye-${side}`;
    return element;
  }

  private track(animation: Animation): void {
    this.animations.add(animation);
    animation.finished.finally(() => this.animations.delete(animation)).catch(() => undefined);
  }

  private clearAnimations(): void {
    this.animations.forEach((animation) => animation.cancel());
    this.animations.clear();
  }
}
