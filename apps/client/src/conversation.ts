import type { RobbieState } from './robbie/types';

export const CONVERSATION_SEQUENCE: ReadonlyArray<{ state: Extract<RobbieState, 'listening' | 'thinking' | 'speaking'>; duration: number }> = [
  { state: 'listening', duration: 900 },
  { state: 'thinking', duration: 1200 },
  { state: 'speaking', duration: 2000 },
];

export class ConversationSimulation {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private index = 0;
  private running = false;

  constructor(private readonly setState: (state: RobbieState) => void) {}

  get isActive(): boolean {
    return this.running;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.index = 0;
    this.advance();
  }

  cancel(): void {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    this.running = false;
    this.index = 0;
  }

  private advance(): void {
    const step = CONVERSATION_SEQUENCE[this.index];
    if (!step) return;

    this.setState(step.state);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      if (this.index === CONVERSATION_SEQUENCE.length - 1) {
        this.running = false;
        this.index = 0;
        this.setState('idle');
        return;
      }
      this.index += 1;
      this.advance();
    }, step.duration);
  }
}
