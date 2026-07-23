import { ROBBIE_STATES } from '@robbie/shared';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TEMPORARY_STATE_DURATION } from './RobbieAnimations';

const ROBBIE_CSS = readFileSync(new URL('./robbie.css', import.meta.url), 'utf8');

function cssRule(selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = ROBBIE_CSS.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`));
  return match?.[1] ?? '';
}

describe('módulo visual original de Robbie', () => {
  it('mantiene los diez estados compartidos', () => {
    expect(ROBBIE_STATES).toEqual([
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
    ]);
  });

  it('define estados temporales con duración positiva', () => {
    expect(TEMPORARY_STATE_DURATION.success).toBeGreaterThan(0);
    expect(TEMPORARY_STATE_DURATION.alert).toBeGreaterThan(0);
    expect(TEMPORARY_STATE_DURATION.error).toBeGreaterThan(0);
  });

  it('mantiene alerta sin sombra de caja y amplía las X de error', () => {
    const alertEye = cssRule(".robbie[data-state='alert'] .robbie-eye");
    const errorMark = cssRule(".robbie[data-state='error'] .robbie-eye::before, .robbie[data-state='error'] .robbie-eye::after");

    expect(alertEye).toContain('box-shadow: none');
    expect(alertEye).toMatch(/filter:\s*drop-shadow\(/);
    expect(errorMark).toContain('width: 138%');
    expect(errorMark).toContain('height: calc(12.5px * var(--robbie-scale))');
    expect(errorMark).toContain('border-radius: 999px');
  });

  it('define una boca sólida y animada para speaking sin glow', () => {
    const mouth = cssRule(".robbie[data-state='speaking'] .robbie-effects::before");
    const mouthAnimation = ROBBIE_CSS.match(/@keyframes robbie-speak-mouth \{[\s\S]*?\n\}/)?.[0] ?? '';

    expect(mouth).toContain("background: var(--robbie-glow-primary)");
    expect(mouth).toContain('width: calc(30px * var(--robbie-scale))');
    expect(mouth).toContain('height: calc(14px * var(--robbie-scale))');
    expect(mouth).toContain('left: calc(50% + 3px * var(--robbie-scale))');
    expect(mouth).toContain('top: calc(50% + 41px * var(--robbie-scale))');
    expect(mouth).toContain('border-radius: calc(6px * var(--robbie-scale))');
    expect(mouth).toContain('box-shadow: none');
    expect(mouth).toContain('filter: none');
    expect(mouth).toContain('animation: robbie-speak-mouth 880ms');
    expect(mouthAnimation).toMatch(/width:|height:|opacity:|transform:/);
    expect(mouthAnimation).not.toMatch(/filter:|box-shadow:|rotate\(|scale\(/);
    expect(ROBBIE_CSS).toContain('width: calc(32px * var(--robbie-scale))');
    expect(ROBBIE_CSS).toContain('height: calc(14px * var(--robbie-scale))');
    expect(ROBBIE_CSS).toContain('border-radius: 0 0 999px 999px');
    expect(ROBBIE_CSS).toMatch(/40%, 48%[^}]*width: calc\(28px[^}]*height: calc\(5px/);
    expect(ROBBIE_CSS).toMatch(/prefers-reduced-motion:[\s\S]*robbie\[data-state='speaking'\] \.robbie-effects::before/);
  });

  it('suaviza la transición de idle a happy y acerca sus arcos', () => {
    const happyRoot = ROBBIE_CSS.match(/(?:^|\n)\.robbie\[data-gesture='happy'\] \{([^}]*)\}/)?.[1] ?? '';
    const happyEyes = ROBBIE_CSS.match(/(?:^|\n)\.robbie\[data-gesture='happy'\] \.robbie-eyes \{([^}]*)\}/)?.[1] ?? '';
    const happyEyesTransition = cssRule(".robbie[data-state='success'] .robbie-eyes, .robbie[data-hearts='true'] .robbie-eyes, .robbie[data-gesture='happy'] .robbie-eyes");
    const happyArc = ROBBIE_CSS.match(/(?:^|\n)\.robbie\[data-gesture='happy'\] \.robbie-eye::before \{([^}]*)\}/)?.[1] ?? '';
    const eye = cssRule('.robbie-eye');
    const happyAnimation = ROBBIE_CSS.match(/@keyframes robbie-happy \{[\s\S]*?\n\}/)?.[0] ?? '';
    const arcAnimation = cssRule('@keyframes robbie-happy-arc-in');

    expect(happyRoot).toContain('width: calc((62px * 2 + 40px) * var(--robbie-scale))');
    expect(happyEyes).toContain('gap: calc(40px * var(--robbie-scale))');
    expect(happyEyesTransition).toContain('transition: transform 600ms cubic-bezier');
    expect(happyEyesTransition).toContain('gap 600ms cubic-bezier');
    expect(eye).toContain('transition: all 600ms cubic-bezier');
    expect(happyArc).toContain('opacity: 0');
    expect(happyArc).toContain('animation: robbie-happy-arc-in 600ms');
    expect(happyAnimation).toContain('translateY(calc(-4px * var(--robbie-scale))) scale(1.02)');
    expect(happyAnimation).not.toContain('translateY(-8px)');
    expect(happyAnimation).not.toContain('scale(1.06)');
    expect(arcAnimation).toContain('opacity');
    expect(arcAnimation).not.toMatch(/transform|width|height|border|radius/);
    expect(ROBBIE_CSS).toMatch(/prefers-reduced-motion:[\s\S]*robbie\[data-gesture='happy'\] \.robbie-eye::before/);
  });

  it('define focus con lentes rectangulares y una taza ampliada', () => {
    const focusEye = cssRule(".robbie[data-state='focus'] .robbie-eye");
    const bridge = cssRule(".robbie[data-state='focus'] .robbie-eye-left::after");
    const bookBefore = cssRule(".robbie[data-state='focus'] .robbie-effects::before");
    const bookAfter = cssRule(".robbie[data-state='focus'] .robbie-effects::after");
    const coffeeCup = cssRule(".robbie[data-state='focus'] .robbie-particles::before");
    const coffeeSteam = cssRule(".robbie[data-state='focus'] .robbie-particles::after");

    expect(focusEye).toContain('width: calc(78px * var(--robbie-scale))');
    expect(focusEye).toContain('height: calc(39px * var(--robbie-scale))');
    expect(focusEye).toContain('border-radius: 7px');
    expect(focusEye).not.toContain('border-radius: 50%');
    expect(focusEye).toContain('background: transparent');
    expect(bridge).toContain('width: calc(32px * var(--robbie-scale))');
    expect(bridge).toContain('background: var(--robbie-glow-primary)');
    expect(bookBefore).toBe('');
    expect(bookAfter).toBe('');
    expect(ROBBIE_CSS).not.toContain('robbie-read-page-left');
    expect(ROBBIE_CSS).not.toContain('robbie-read-page-right');
    expect(coffeeCup).toContain('background-color: transparent');
    expect(coffeeCup).toContain('background-image: var(--robbie-coffee-cup-image)');
    expect(coffeeCup).toContain('width: calc(38px * var(--robbie-scale))');
    expect(coffeeCup).toContain('height: calc(34px * var(--robbie-scale))');
    expect(coffeeCup).toContain('top: calc(50% + 31px * var(--robbie-scale))');
    expect(coffeeCup).toContain('right: calc(-54px * var(--robbie-scale))');
    expect(coffeeSteam).toContain('background-image: var(--robbie-coffee-steam-image)');
    expect(coffeeSteam).toContain('right: calc(-50px * var(--robbie-scale))');
    expect(coffeeSteam).toContain('top: calc(50% + 10px * var(--robbie-scale))');
    expect(coffeeSteam).toContain('animation: robbie-coffee-steam 3.2s');
    expect(ROBBIE_CSS).toContain("stroke='%23eaf5ff'");
    expect(ROBBIE_CSS).toContain("stroke='%239b6cff'");
    expect(ROBBIE_CSS).toContain('animation: robbie-read 2.8s');
    expect(ROBBIE_CSS).toMatch(/\.robbie\[data-state='focus'\][^}]*width: calc\(\(78px \* 2 \+ 32px\)/);
    expect(ROBBIE_CSS).toMatch(/\.robbie\[data-state='focus'\] \.robbie-eyes[^}]*gap: calc\(32px \* var\(--robbie-scale\)\)/);
    expect(ROBBIE_CSS).toMatch(/prefers-reduced-motion:[\s\S]*robbie\[data-state='focus'\] \.robbie-particles::after/);
  });

  it('define la composición estable y hueca de thinking', () => {
    const leftEye = cssRule(".robbie[data-state='thinking'] .robbie-eye-left");
    const rightEye = cssRule(".robbie[data-state='thinking'] .robbie-eye-right");
    const arc = cssRule(".robbie[data-state='thinking'] .robbie-eye-right::before");

    expect(ROBBIE_CSS).toContain('--robbie-eye-gap: 48px');
    expect(ROBBIE_CSS).toContain('--robbie-eye-width: 27.5px');
    expect(ROBBIE_CSS).toContain('--robbie-eye-height: 77.5px');
    expect(ROBBIE_CSS).toMatch(/\.robbie\[data-state='idle'\] \.robbie-eyes[^}]*gap: calc\(52px \* var\(--robbie-scale\)\)/);
    expect(ROBBIE_CSS).not.toMatch(/gap:\s*calc\(42px/);
    expect(ROBBIE_CSS).toContain('transition: transform 520ms cubic-bezier');
    expect(ROBBIE_CSS).toContain('transition: all 600ms cubic-bezier');
    expect(leftEye).toContain('width: calc(var(--robbie-eye-width) * var(--robbie-scale))');
    expect(leftEye).toContain('height: calc(39px * var(--robbie-scale))');
    expect(leftEye).toContain('transform: rotate(10deg)');
    expect(leftEye).toContain('border-radius: 999px');
    expect(leftEye).toContain('box-shadow: 0 0 8px var(--robbie-glow-primary)');
    expect(leftEye).toContain('animation: robbie-think-left-glow');
    expect(rightEye).toContain('width: calc(var(--robbie-eye-width) * var(--robbie-scale))');
    expect(rightEye).toContain('height: calc(var(--robbie-eye-height) * var(--robbie-scale))');
    expect(rightEye).toContain('background: var(--robbie-glow-primary)');
    expect(rightEye).toContain('border-radius: 999px');
    expect(rightEye).toContain('transform: rotate(10deg)');
    expect(arc).toBe('');
    expect(ROBBIE_CSS).toMatch(/\.robbie\[data-state='success'\] \.robbie-eye::before, \.robbie\[data-hearts='true'\] \.robbie-eye::before, \.robbie\[data-gesture='happy'\] \.robbie-eye::before/);
    expect(ROBBIE_CSS).not.toMatch(/data-state='success'\] \.robbie-particles::before/);
    expect(ROBBIE_CSS).toMatch(/\.robbie\[data-state='success'\] \.robbie-eye, \.robbie\[data-hearts='true'\] \.robbie-eye/);
    expect(ROBBIE_CSS).toMatch(/\.robbie\[data-state='success'\], \.robbie\[data-hearts='true'\], \.robbie\[data-gesture='happy'\][^}]*width: calc\(\(62px \* 2 \+ 48px\)/);
    expect(ROBBIE_CSS).toMatch(/\.robbie\[data-state='success'\] \.robbie-eyes, \.robbie\[data-hearts='true'\] \.robbie-eyes, \.robbie\[data-gesture='happy'\] \.robbie-eyes[^}]*justify-content: center[^}]*gap: calc\(var\(--robbie-eye-gap\)/);
    expect(ROBBIE_CSS).toMatch(/\.robbie\[data-state='thinking'\][^}]*width: calc\(\(27\.5px \* 2 \+ 48px\)/);
    expect(ROBBIE_CSS).toMatch(/\.robbie\[data-state='speaking'\] \.robbie-eye[^}]*height: calc\(59px/);
    expect(ROBBIE_CSS).toMatch(/\.robbie\[data-state='success'\] \.robbie-eye[^}]*width: calc\(62px[^}]*height: calc\(28px/);
    expect(cssRule(".robbie[data-state='thinking'] .robbie-eye-right::after")).toBe('');

    const leftGlow = cssRule('@keyframes robbie-think-left-glow');
    const curveGlow = cssRule('@keyframes robbie-think-curve-glow');
    expect(leftGlow).toMatch(/filter:\s*brightness/);
    expect(leftGlow).not.toMatch(/transform|width|height|border|radius/);
    expect(curveGlow).toContain('opacity');
    expect(curveGlow).not.toMatch(/transform|width|height|border|radius/);
    expect(ROBBIE_CSS).toMatch(/prefers-reduced-motion:[^{]+\{[\s\S]*robbie-particles::before/);
  });

  it('escala ondas, burbujas, corazones, focus y boca dentro de 128×64', () => {
    const listeningLeft = cssRule(".robbie[data-state='listening'] .robbie-eye-left::before");
    const thinkingDots = ROBBIE_CSS.match(/\.robbie\[data-state='thinking'\] \.robbie-particles::before \{([\s\S]*?)\n\}/)?.[1] ?? '';
    const heart = cssRule('.robbie-heart');
    const focusEyes = cssRule(".robbie[data-state='focus'] .robbie-eyes");
    const mouthAnimation = ROBBIE_CSS.match(/@keyframes robbie-speak-mouth \{[\s\S]*?\n\}/)?.[0] ?? '';

    expect(listeningLeft).toContain('margin-right: calc(10px * var(--robbie-scale))');
    expect(listeningLeft).toContain('border-left: calc(3px * var(--robbie-scale))');
    expect(thinkingDots).toContain('right: calc(-34px * var(--robbie-scale))');
    expect(thinkingDots).toContain('width: calc(4px * var(--robbie-scale))');
    expect(heart).toContain('text-shadow: 0 0 calc(8px * var(--robbie-scale))');
    expect(ROBBIE_CSS).toContain('translateY(calc(-48px * var(--robbie-scale)))');
    expect(focusEyes).toContain('translateY(calc(-12px * var(--robbie-scale)))');
    expect(ROBBIE_CSS).toContain('translateY(calc(-14px * var(--robbie-scale)))');
    expect(mouthAnimation).toContain('translateY(calc(1px * var(--robbie-scale)))');
    expect(mouthAnimation).toContain('translateY(calc(-1px * var(--robbie-scale)))');
    expect(mouthAnimation).toContain('width: calc(32px * var(--robbie-scale))');
  });
});
