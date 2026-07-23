import { RobbieView } from './RobbieView';
import type { RobbieState } from './types';

type Gesture = 'blink' | 'look-left' | 'look-right' | 'happy';

export class RobbiePersonality {
  private timers = new Set<number>();
  private stopped = false;
  private lastGesture: Gesture | undefined;

  constructor(private readonly view: RobbieView, private readonly getState: () => RobbieState) {}

  start(): void {
    this.scheduleBlink();
    this.scheduleLook();
    this.scheduleHappy();
  }

  stop(): void {
    this.stopped = true;
    this.timers.forEach((timer) => window.clearTimeout(timer));
    this.timers.clear();
    this.view.clearGesture();
  }

  private scheduleBlink(): void {
    this.schedule(() => {
      if (this.getState() === 'idle') this.play('blink', 190);
      this.scheduleBlink();
    }, 2500, 6000);
  }

  private scheduleLook(): void {
    this.schedule(() => {
      if (this.getState() === 'idle') this.play(Math.random() > 0.5 ? 'look-left' : 'look-right', 760);
      this.scheduleLook();
    }, 9000, 16000);
  }

  private scheduleHappy(): void {
    this.schedule(() => {
      if (this.getState() === 'idle') this.play('happy', 1900);
      this.scheduleHappy();
    }, 10000, 20000);
  }

  private play(gesture: Gesture, duration: number): void {
    if (gesture === this.lastGesture && gesture !== 'happy') return;
    this.lastGesture = gesture;
    this.view.setGesture(gesture);
    const timer = window.setTimeout(() => {
      this.timers.delete(timer);
      this.view.clearGesture();
    }, duration);
    this.timers.add(timer);
  }

  private schedule(callback: () => void, min: number, max: number): void {
    if (this.stopped) return;
    const timer = window.setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, min + Math.random() * (max - min));
    this.timers.add(timer);
  }
}
