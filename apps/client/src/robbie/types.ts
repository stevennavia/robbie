export const ROBBIE_STATES = [
  'idle',
  'listening',
  'thinking',
  'speaking',
  'focus',
  'paused',
  'success',
  'alert',
  'error',
  'offline',
] as const;

export type RobbieState = (typeof ROBBIE_STATES)[number];
export type RobbieEventName = 'statechange' | 'destroy';

export interface RobbieStateChangeDetail {
  state: RobbieState;
  previousState: RobbieState;
}

export interface RobbieOptions {
  container: HTMLElement;
  state?: RobbieState;
  className?: string;
  autoStartPersonality?: boolean;
}

export interface RobbieController {
  readonly state: RobbieState;
  readonly previousState: RobbieState;
  setState(state: RobbieState): void;
  success(): void;
  alert(): void;
  error(): void;
  hearts(): void;
  on(event: RobbieEventName, listener: EventListener): () => void;
  destroy(): void;
}
