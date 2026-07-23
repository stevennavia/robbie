import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const MAIN_TS = readFileSync(new URL('./main.ts', import.meta.url), 'utf8');
const INDEX_HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const LAYOUT_CSS = readFileSync(new URL('./styles/layout.css', import.meta.url), 'utf8');
const DEV_PANEL_TS = readFileSync(new URL('./ui/dev-panel.ts', import.meta.url), 'utf8');
const TAURI_CONFIG = readFileSync(new URL('../../../src-tauri/tauri.conf.json', import.meta.url), 'utf8');
const TAURI_MAIN_RS = readFileSync(new URL('../../../src-tauri/src/main.rs', import.meta.url), 'utf8');

describe('dashboard Tauri', () => {
  it('fuerza el modo completo e ignora el modo compacto persistido', () => {
    expect(MAIN_TS).toContain("const isDashboardWindow = windowMode === 'dashboard';");
    expect(MAIN_TS).toContain("if (isDashboardWindow) return 'full';");
    expect(MAIN_TS).toContain("const effectiveMode = isDashboardWindow ? 'full' : mode;");
    expect(MAIN_TS).toContain('toggle.hidden = true;');
  });

  it('mantiene el panel y sus diez estados en dashboard, pero lo oculta en Robbie', () => {
    expect(INDEX_HTML).toContain('id="dev-panel-grid"');
    expect(DEV_PANEL_TS).toContain('for (const state of ROBBIE_STATES)');
    expect(DEV_PANEL_TS).toContain('button.setAttribute(\'aria-pressed\'');
    expect(LAYOUT_CSS).toContain(".app[data-window='robbie'] .tray");
    expect(LAYOUT_CSS).not.toContain(".app[data-window='dashboard'] .tray { display: none");
    expect(LAYOUT_CSS).toContain(".app[data-window='dashboard'] .tray {\n  display: flex;");
    expect(LAYOUT_CSS).toContain(".app[data-window='dashboard'] .app-nav {\n  display: flex;");
    expect(LAYOUT_CSS).not.toContain(".app[data-window='dashboard'] .robbie-shell");
    expect(LAYOUT_CSS).not.toContain(".app[data-window='dashboard'] .stage-state");
    expect(LAYOUT_CSS).toContain(".app[data-window='dashboard'] .stage-action");
    expect(LAYOUT_CSS).toContain(".app[data-window='robbie'] .tray");
  });

  it('configura Robbie flotante a 128×64, libre y con visibilidad gobernada por el foco', () => {
    expect(TAURI_CONFIG).toMatch(/"label": "robbie"[\s\S]*?"width": 128[\s\S]*?"height": 64/);
    expect(TAURI_CONFIG).toMatch(/"label": "robbie"[\s\S]*?"visible": false/);
    expect(MAIN_TS).toContain('let robbiePinned = false;');
    expect(MAIN_TS).toContain('applyPinnedState(false);');
    expect(TAURI_MAIN_RS).toContain('WindowEvent::Focused(focused)');
    expect(TAURI_MAIN_RS).toContain('set_robbie_visible(app, !focused);');
    expect(TAURI_MAIN_RS).toContain('let _ = robbie.show();');
    expect(TAURI_MAIN_RS).toContain('let _ = robbie.hide();');
  });

  it('conecta el botón Mostrar Robbie con la ventana Tauri', () => {
    expect(INDEX_HTML).toContain('id="show-robbie"');
    expect(MAIN_TS).toContain("requireElement<HTMLButtonElement>('#show-robbie')");
    expect(MAIN_TS).toContain('showRobbieWindow()');
    expect(MAIN_TS).toContain("button.textContent = 'Robbie visible';");
    expect(readFileSync(new URL('./tauri-bridge.ts', import.meta.url), 'utf8')).toContain("invoke('show_robbie_window')");
    expect(TAURI_MAIN_RS).toContain('fn show_robbie_window');
  });

  it('incluye el botón de modo hardware y el comando de redimensionamiento', () => {
    expect(INDEX_HTML).toContain('id="size-mode-toggle"');
    expect(MAIN_TS).toContain("requireElement<HTMLButtonElement>('#size-mode-toggle')");
    expect(MAIN_TS).toContain('setRobbieSizeMode(nextMode)');
    expect(readFileSync(new URL('./tauri-bridge.ts', import.meta.url), 'utf8')).toContain("invoke('set_robbie_size_mode'");
    expect(TAURI_MAIN_RS).toContain('fn set_robbie_size_mode');
    expect(TAURI_MAIN_RS).toContain('PhysicalSize::new(128, 64)');
    expect(TAURI_MAIN_RS).toContain('PhysicalSize::new(280, 240)');
    expect(MAIN_TS).toContain("visual.style.setProperty('--robbie-scale', hardware ? '0.80' : '0.546');");
    expect(MAIN_TS).toContain("setAttribute('data-size-mode', hardware ? 'hardware' : 'compact')");
  });

  it('encadena minimizar dashboard y mostrar Robbie al iniciar enfoque', () => {
    expect(MAIN_TS).toContain('async function moveDashboardToRobbieFocus()');
    expect(MAIN_TS).toContain('await minimizeCurrentWindow();');
    expect(MAIN_TS).toContain('await showRobbieWindow();');
    expect(MAIN_TS).toContain('void moveDashboardToRobbieFocus();');
    expect(MAIN_TS.match(/initShowRobbie\(\);/g)?.length).toBe(1);
  });

  it('inicia el drag nativo desde mousedown y conserva el click como conversación', () => {
    const dragSection = MAIN_TS.match(/function initDragHappy\(\): void \{([\s\S]*?)\n\}\n\n\/\* ---------- Escalar Robbie/s)?.[1] ?? '';
    const mouseDownIndex = dragSection.indexOf("casing.addEventListener('mousedown'");
    const pointerMoveIndex = dragSection.indexOf('const moveDrag');

    expect(mouseDownIndex).toBeGreaterThanOrEqual(0);
    expect(dragSection.slice(mouseDownIndex, pointerMoveIndex)).toContain('getRobbieWindowPosition');
    expect(dragSection.slice(pointerMoveIndex)).toContain('moveRobbieWindow');
    expect(dragSection).toContain('windowStartPosition = !robbiePinned ? getRobbieWindowPosition() : undefined;');
    expect(dragSection).toContain("casing.addEventListener('mouseleave'");
    expect(dragSection).toContain("window.addEventListener('blur', clearDrag);");
    expect(dragSection).toContain("window.addEventListener('mouseup', endDrag);");
    expect(dragSection).toContain('const shouldStartConversation = !isDragging;');
    expect(dragSection).toContain('startConversation();');
    expect(INDEX_HTML).toContain('<div class="robbie__casing" data-tauri-drag-region>');
    expect(INDEX_HTML).toContain('<div class="robbie__screen" data-tauri-drag-region>');
  });
});
