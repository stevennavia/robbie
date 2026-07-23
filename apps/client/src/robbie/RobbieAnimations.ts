import type { RobbieState } from './types';

export const TEMPORARY_STATE_DURATION: Record<Extract<RobbieState, 'success' | 'alert' | 'error'>, number> = {
  success: 1100,
  alert: 1300,
  error: 1200,
};

export function animateState(root: HTMLElement, state: RobbieState): Animation | undefined {
  if (typeof root.animate !== 'function') return undefined;
  const animation = root.animate(
    [
      { opacity: 0.78, transform: 'scaleX(.88) scaleY(.92)' },
      { opacity: 1, transform: 'scaleX(1) scaleY(1)' },
    ],
    { duration: 480, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' },
  );
  root.style.setProperty('--robbie-transition-state', `"${state}"`);
  return animation;
}

export function animateEffect(root: HTMLElement, name: string): Animation | undefined {
  if (typeof root.animate !== 'function') return undefined;
  const presets: Record<string, Keyframe[]> = {
    success: [{ transform: 'translateY(0) scale(1)', filter: 'brightness(1)' }, { transform: 'translateY(-9px) scale(1.04)', filter: 'brightness(1.3)' }, { transform: 'translateY(0) scale(1)', filter: 'brightness(1)' }],
    alert: [{ transform: 'scale(1)' }, { transform: 'scale(1.04)' }, { transform: 'scale(1)' }, { transform: 'scale(1.03)' }, { transform: 'scale(1)' }],
    error: [{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }],
  };
  return root.animate(presets[name] ?? [], { duration: 700, easing: 'ease-in-out' });
}
