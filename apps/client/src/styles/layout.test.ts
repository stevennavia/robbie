import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const LAYOUT_CSS = readFileSync(new URL('./layout.css', import.meta.url), 'utf8');

describe('layout de la ventana flotante de Robbie', () => {
  it('usa escala estructural y conserva el lienzo 128×64', () => {
    const robbieWindow = LAYOUT_CSS.match(/\.app\[data-window='robbie'\] \.robbie \{([^}]*)\}/)?.[1] ?? '';
    const screen = LAYOUT_CSS.match(/\.app\[data-window='robbie'\] \.robbie__screen \{([^}]*)\}/)?.[1] ?? '';

    expect(robbieWindow).toContain('--robbie-scale: 0.546');
    expect(robbieWindow).not.toContain('transform: scale(0.546)');
    expect(screen).toContain('width: calc(128px * var(--robbie-frame-scale, 1))');
    expect(screen).toContain('height: calc(64px * var(--robbie-frame-scale, 1))');
    expect(LAYOUT_CSS).toContain('--robbie-frame-scale: 2');
  });

  it('duplica uniformemente el lienzo en modo hardware sin deformarlo', () => {
    expect(LAYOUT_CSS).toContain(".app[data-window='robbie'][data-size-mode='hardware']");
    expect(LAYOUT_CSS).toContain('--robbie-frame-scale: 2');
    expect(LAYOUT_CSS).not.toContain('scaleX(');
    expect(LAYOUT_CSS).not.toContain('scaleY(');
  });

  it('mantiene la altura del módulo dentro del lienzo hardware', () => {
    const robbieCss = readFileSync(new URL('../robbie/robbie.css', import.meta.url), 'utf8');
    expect(robbieCss).toContain('height: calc(150px * var(--robbie-scale))');
    expect(readFileSync(new URL('../main.ts', import.meta.url), 'utf8'))
      .toContain("hardware ? '0.80' : '0.546'");
    expect(LAYOUT_CSS).toContain('height: calc(64px * var(--robbie-frame-scale, 1))');
  });

  it('deja que la altura visual se calcule proporcionalmente desde el módulo Robbie', () => {
    expect(LAYOUT_CSS).toContain('--robbie-scale: 0.546');
    expect(readFileSync(new URL('../robbie/robbie.css', import.meta.url), 'utf8'))
      .toContain('height: calc(150px * var(--robbie-scale))');
  });
});
