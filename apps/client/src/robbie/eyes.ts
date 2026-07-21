export interface EyesDrawOptions {
  /** Brillo de los ojos: 0 = apagados, 1 = máximo. */
  intensity: number;
}

const EYE_COLOR_RGB = '90, 200, 250'; // celeste

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Dibuja los dos ojos neutros de Robbie en Canvas 2D:
 * cápsulas verticales celestes, centradas, sin boca ni círculo externo.
 * El canvas se ajusta al tamaño CSS del elemento y al devicePixelRatio.
 */
export function drawEyes(canvas: HTMLCanvasElement, options: EyesDrawOptions): void {
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }

  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;
  if (cssWidth === 0 || cssHeight === 0) {
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  const pixelWidth = Math.round(cssWidth * dpr);
  const pixelHeight = Math.round(cssHeight * dpr);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, cssWidth, cssHeight);

  const intensity = clamp01(options.intensity);

  // Geometría proporcional: los ojos siguen centrados a cualquier tamaño.
  const eyeWidth = cssWidth * 0.11;
  const eyeHeight = cssHeight * 0.46;
  const innerGap = cssWidth * 0.17;
  const topY = cssHeight / 2 - eyeHeight / 2;
  const leftX = cssWidth / 2 - innerGap / 2 - eyeWidth;
  const rightX = cssWidth / 2 + innerGap / 2;
  const cornerRadius = eyeWidth / 2;

  context.fillStyle = `rgba(${EYE_COLOR_RGB}, ${intensity})`;
  context.shadowColor = `rgba(${EYE_COLOR_RGB}, ${0.5 * intensity})`;
  context.shadowBlur = 10 * intensity;

  for (const x of [leftX, rightX]) {
    context.beginPath();
    context.roundRect(x, topY, eyeWidth, eyeHeight, cornerRadius);
    context.fill();
  }
}
