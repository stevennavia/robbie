import { emit, listen, type UnlistenFn } from '@tauri-apps/api/event';
import { PhysicalPosition } from '@tauri-apps/api/dpi';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { RobbieState } from './robbie/types';

export type RobbieWindowMode = 'dashboard' | 'robbie';
export type RobbieSizeMode = 'compact' | 'hardware';

export const ROBBIE_EVENTS = {
  button: 'robbie:button-pressed',
  pinned: 'robbie:pinned-changed',
  requestPinned: 'robbie:request-pinned',
  ready: 'robbie:ready',
  requestState: 'robbie:request-state',
  state: 'robbie:state-changed',
} as const;

interface TauriWindow extends Window {
  __TAURI_INTERNALS__?: unknown;
}

export function getWindowMode(): RobbieWindowMode {
  const value = new URLSearchParams(window.location.search).get('window');
  return value === 'robbie' ? 'robbie' : 'dashboard';
}

export function isTauriRuntime(): boolean {
  return Boolean((window as TauriWindow).__TAURI_INTERNALS__);
}

export async function publishRobbieState(state: RobbieState): Promise<void> {
  if (isTauriRuntime()) await emit(ROBBIE_EVENTS.state, { state, source: getWindowMode() });
}

export async function publishRobbieButton(): Promise<void> {
  if (isTauriRuntime()) await emit(ROBBIE_EVENTS.button);
}

export async function publishRobbieReady(): Promise<void> {
  if (isTauriRuntime()) await emit(ROBBIE_EVENTS.ready);
}

export async function publishStateRequest(): Promise<void> {
  if (isTauriRuntime()) await emit(ROBBIE_EVENTS.requestState);
}

export async function publishPinnedState(pinned: boolean): Promise<void> {
  if (isTauriRuntime()) await emit(ROBBIE_EVENTS.pinned, { pinned });
}

export async function publishPinnedRequest(): Promise<void> {
  if (isTauriRuntime()) await emit(ROBBIE_EVENTS.requestPinned);
}

export async function showRobbieWindow(): Promise<void> {
  if (isTauriRuntime()) await invoke('show_robbie_window');
}

export async function setRobbieSizeMode(mode: RobbieSizeMode): Promise<void> {
  if (isTauriRuntime()) await invoke('set_robbie_size_mode', { mode });
}

export async function minimizeCurrentWindow(): Promise<void> {
  if (isTauriRuntime()) await getCurrentWindow().minimize();
}

export function subscribeToRobbieState(listener: (state: RobbieState, source?: RobbieWindowMode) => void): Promise<UnlistenFn | undefined> {
  if (!isTauriRuntime()) return Promise.resolve(undefined);
  return listen<{ state: RobbieState; source?: RobbieWindowMode }>(ROBBIE_EVENTS.state, (event) => listener(event.payload.state, event.payload.source));
}

export function subscribeToRobbieButton(listener: () => void): Promise<UnlistenFn | undefined> {
  if (!isTauriRuntime()) return Promise.resolve(undefined);
  return listen(ROBBIE_EVENTS.button, listener);
}

export function subscribeToRobbieReady(listener: () => void): Promise<UnlistenFn | undefined> {
  if (!isTauriRuntime()) return Promise.resolve(undefined);
  return listen(ROBBIE_EVENTS.ready, listener);
}

export function subscribeToStateRequest(listener: () => void): Promise<UnlistenFn | undefined> {
  if (!isTauriRuntime()) return Promise.resolve(undefined);
  return listen(ROBBIE_EVENTS.requestState, listener);
}

export function subscribeToPinnedState(listener: (pinned: boolean) => void): Promise<UnlistenFn | undefined> {
  if (!isTauriRuntime()) return Promise.resolve(undefined);
  return listen<{ pinned: boolean }>(ROBBIE_EVENTS.pinned, (event) => listener(event.payload.pinned));
}

export function subscribeToPinnedRequest(listener: () => void): Promise<UnlistenFn | undefined> {
  if (!isTauriRuntime()) return Promise.resolve(undefined);
  return listen(ROBBIE_EVENTS.requestPinned, listener);
}

export interface RobbieWindowPosition {
  x: number;
  y: number;
}

export async function getRobbieWindowPosition(): Promise<RobbieWindowPosition | undefined> {
  if (!isTauriRuntime()) return undefined;
  const position = await getCurrentWindow().outerPosition();
  return { x: position.x, y: position.y };
}

export async function moveRobbieWindow(position: RobbieWindowPosition): Promise<void> {
  if (!isTauriRuntime()) return;
  await getCurrentWindow().setPosition(new PhysicalPosition(position.x, position.y));
}
