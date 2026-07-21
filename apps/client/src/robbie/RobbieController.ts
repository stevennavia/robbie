import { TEMPORARY_STATE_DURATION } from './RobbieAnimations';
import { RobbiePersonality } from './RobbiePersonality';
import { RobbieView } from './RobbieView';
import type { RobbieController as RobbieControllerApi, RobbieEventName, RobbieState, RobbieStateChangeDetail } from './types';

export class RobbieController implements RobbieControllerApi {
  private currentState: RobbieState;
  private lastState: RobbieState;
  private temporaryTimer: number | undefined;
  private destroyed = false;
  private readonly events = new EventTarget();
  private readonly personality: RobbiePersonality;

  constructor(private readonly view: RobbieView, initialState: RobbieState, autoStartPersonality = true) {
    this.currentState = initialState;
    this.lastState = initialState;
    this.view.setState(initialState);
    this.personality = new RobbiePersonality(view, () => this.currentState);
    if (autoStartPersonality) this.personality.start();
  }

  get state(): RobbieState { return this.currentState; }
  get previousState(): RobbieState { return this.lastState; }

  setState(state: RobbieState): void {
    if (this.destroyed || state === this.currentState) return;
    const previousState = this.currentState;
    this.lastState = previousState;
    this.currentState = state;
    this.clearTemporary();
    this.view.clearGesture();
    this.view.setState(state);
    this.emit('statechange', { state, previousState });
  }

  success(): void { this.temporary('success'); }
  alert(): void { this.temporary('alert'); }
  error(): void { this.temporary('error'); }
  hearts(): void {
    if (this.destroyed) return;
    this.view.clearGesture();
    this.view.playHearts();
  }

  on(event: RobbieEventName, listener: EventListener): () => void {
    this.events.addEventListener(event, listener);
    return () => this.events.removeEventListener(event, listener);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.clearTemporary();
    this.personality.stop();
    this.view.destroy();
    this.events.dispatchEvent(new Event('destroy'));
  }

  private temporary(state: Extract<RobbieState, 'success' | 'alert' | 'error'>): void {
    if (this.destroyed) return;
    const returnState = this.currentState === state ? this.lastState : this.currentState;
    this.lastState = returnState;
    this.currentState = state;
    this.view.clearGesture();
    this.view.setState(state);
    this.view.playEffect(state);
    this.emit('statechange', { state, previousState: returnState });
    this.clearTemporary();
    this.temporaryTimer = window.setTimeout(() => {
      this.temporaryTimer = undefined;
      if (!this.destroyed && this.currentState === state) this.setState(returnState || 'idle');
    }, TEMPORARY_STATE_DURATION[state]);
  }

  private clearTemporary(): void {
    if (this.temporaryTimer !== undefined) window.clearTimeout(this.temporaryTimer);
    this.temporaryTimer = undefined;
  }

  private emit(type: RobbieEventName, detail?: RobbieStateChangeDetail): void {
    this.events.dispatchEvent(new CustomEvent(type, { detail }));
  }
}
