# Arquitectura — Robbie Virtual (Fases 1 y 2)

## Visión general

Robbie Virtual es un asistente de escritorio **local** para macOS. La Fase 1 establece la base técnica: un monorepo con tres paquetes y un canal de comunicación en tiempo real entre cliente y servidor. La Fase 2 construye sobre esa base la interfaz visual definitiva del MVP. No hay inteligencia artificial, persistencia ni integraciones externas todavía.

```
┌────────────────────────────────────────────────────────────┐
│                         monorepo robbie                     │
│                                                             │
│  ┌──────────────────┐          ┌──────────────────┐        │
│  │   apps/client    │          │   apps/server    │        │
│  │  @robbie/client  │          │  @robbie/server  │        │
│  │                  │          │                  │        │
│  │  Vite + TS       │  HTTP    │  Express         │        │
│  │  (sin framework) │ ──────── │  GET /api/health │        │
│  │  puerto 5173     │          │                  │        │
│  │                  │  WS /ws  │  ws (WebSocket)  │        │
│  │                  │ ◀──────▶ │  puerto 3001     │        │
│  └────────┬─────────┘          └────────┬─────────┘        │
│           │                             │                   │
│           │      ┌──────────────────┐   │                   │
│           └─────▶│ packages/shared  │◀──┘                   │
│                  │  @robbie/shared  │                        │
│                  │  tipos + Zod     │                        │
│                  └──────────────────┘                        │
└────────────────────────────────────────────────────────────┘
```

## Paquetes

### `packages/shared` — `@robbie/shared`

Única fuente de verdad para los contratos entre cliente y servidor. Ambos lados validan los mensajes con los mismos esquemas Zod.

- `robbie-state.ts`: los 10 estados de Robbie (`idle`, `listening`, `thinking`, `speaking`, `focus`, `paused`, `success`, `alert`, `error`, `offline`), su esquema Zod y etiquetas en español.
- `websocket-events.ts`: unión discriminada de eventos WebSocket (`connection.ready`, `robbie.state.changed`, `system.error`) y `parseWebSocketEvent()`, que valida sin lanzar excepciones.
- `api-types.ts`: `ApiError` (`code`, `message`, `details?`), la envoltura `{ error }` de las respuestas HTTP y `HealthResponse`.
- `errors.ts`: códigos de error conocidos y el helper `createApiError()`.

Se compila con `tsc` a `dist/` (ESM + declaraciones). Los demás paquetes consumen siempre la salida compilada, no el código fuente.

### `apps/server` — `@robbie/server`

Servidor local Node.js + Express sobre `http://localhost:3001`.

- `config.ts`: configuración por variables de entorno validada con Zod (`loadConfig` es una función pura y testeable). `loadRootEnvFile()` carga el `.env` de la raíz de forma opcional usando `process.loadEnvFile()` nativo de Node (sin dependencia `dotenv`).
- `app.ts`: construye la aplicación Express: JSON, CORS restringido al `CLIENT_ORIGIN` configurado, rutas, 404 estructurado y middleware centralizado de errores. Separada de `index.ts` para poder probarla con supertest sin abrir puertos.
- `routes/root.ts`: `GET /` → JSON informativo `{ service, status, client, health }` (el campo `client` refleja el `CLIENT_ORIGIN` configurado). No redirige ni sirve estáticos: la API y el cliente permanecen separados.
- `routes/health.ts`: `GET /api/health` → `{ status, service, timestamp }`.
- `middleware/error-handler.ts`: respuestas de error con la forma `{ error: { code, message, details? } }`.
- `websocket.ts`: `WebSocketServer` montado sobre el mismo servidor HTTP en el path `/ws`.
  - Al conectarse, el cliente recibe `{ "type": "connection.ready", "payload": { "connected": true } }`.
  - Verifica la cabecera `Origin` contra `CLIENT_ORIGIN` (los navegadores siempre la envían; las herramientas locales sin `Origin` se permiten).
  - Los mensajes entrantes se validan con Zod; los inválidos reciben un evento `system.error` con código `INVALID_MESSAGE`.
  - Un `robbie.state.changed` válido se reenvía (broadcast) a todos los clientes conectados.
- `index.ts`: punto de entrada. Arranque, logs simples con marca de tiempo (sin datos privados) y **cierre limpio** ante `SIGINT`/`SIGTERM`: cierra clientes WS, el servidor WS y el servidor HTTP, con salida forzada a los 5 segundos como red de seguridad. Los errores de arranque se comunican con mensajes claros (puerto en uso → `EADDRINUSE`, sin permisos → `EACCES`) y salida con código 1.

### `apps/client` — `@robbie/client`

Interfaz web con Vite + TypeScript puro (sin React ni frameworks visuales), servida en `http://localhost:5173`.

- `connection.ts`: clase `RobbieConnection`. Conecta con `ws://localhost:3001/ws`, valida cada mensaje con los esquemas compartidos y reconecta automáticamente con **espera progresiva limitada**: 1s → 2s → 4s → 8s, con tope de 10s entre intentos.
- `main.ts`: orquesta la aplicación: navegación entre secciones, alternancia de modo completo/compacto (persistida en `localStorage`, sobreescribible con `?mode=`), indicador de conexión y aplicación del estado de Robbie.
- `robbie/eyes.ts`: dibuja los ojos en Canvas 2D (cápsulas verticales celestes, centradas, geometría proporcional, ajuste por `devicePixelRatio`).
- `robbie/state-visuals.ts`: función pura `getStateVisual(state)` → `{ eyeIntensity, accent, label }`. Es la representación simple de la Fase 2; el motor de expresiones llegará en la Fase 3.
- `robbie/robbie-view.ts`: clase `RobbieView`. Posee el canvas, la etiqueta de estado y el atributo `data-state`; redibuja con `ResizeObserver` y suaviza el brillo con un *lerp* de 180 ms (desactivado con `prefers-reduced-motion`).
- `ui/dev-panel.ts`: panel temporal con los diez estados (sustituye al selector de la Fase 1).
- `styles/`: CSS modular — `base.css` (tokens, reset, foco visible, reduced-motion), `layout.css` (shell, modos, responsive), `robbie.css` (carcasa), `tray.css` (bandeja y panel dev).

#### Anatomía de Robbie (Fase 2)

Robbie se construye íntegramente con HTML y CSS, sin imágenes:

- **Carcasa** marfil mate (`--robbie-ivory`), rectangular compacta con esquinas muy redondeadas y profundidad por sombras suaves e inset.
- **Pantalla** frontal negra profunda con `aspect-ratio: 2 / 1` (128:64) garantizado por CSS; contiene el `<canvas>` de los ojos.
- **Botón superior** único, bajo y discreto (óvalo), con un aro de luz sutil cuyo color refleja el estado actual (`data-state` + `--ring-color`).
- **Rejilla de parlante** bajo la pantalla: patrón ordenado de orificios (`radial-gradient` repetido) con sombra interior, integrada en la carcasa.
- Sin botones laterales, sin cámara y sin micrófono visible (es interno).

Al cambiar de estado solo varían tres cosas: la etiqueta, la intensidad de los ojos y el color del aro del botón.

#### Modos de visualización

- **Completo**: grid `nav | Robbie | bandeja (20rem)`. Robbie es el protagonista; la bandeja contiene la sección activa y el panel de desarrollo.
- **Compacto**: solo Robbie, su estado y la acción principal (placeholder de «Conversar»). Sin bandeja ni navegación.

Responsive: a ≤1100px la bandeja pasa debajo del escenario (nunca fuera de pantalla); a ≤760px la navegación se convierte en barra inferior. Sin scroll horizontal en ninguna resolución objetivo (1440×900, 1280×800, 1024×768, ventana compacta).

## Flujos de datos

### Salud del servidor (HTTP)

```
cliente ──GET /api/health──▶ Express ──▶ healthRouter
        ◀──{ status: "ok", service: "robbie-server", timestamp }──
```

### Conexión WebSocket

```
cliente ──upgrade /ws──▶ servidor (verifica Origin)
       ◀──{ type: "connection.ready", payload: { connected: true } }──

cliente ──{ type: "robbie.state.changed", payload: { state } }──▶ servidor
        (el servidor valida con Zod y reenvía a todos los clientes)
```

### Errores

- HTTP: cualquier ruta desconocida → `404` con `{ error: { code: "NOT_FOUND", message } }`; cualquier excepción → `500` con `{ error: { code: "INTERNAL_ERROR", message } }`.
- WS: mensaje no JSON o no conforme al esquema → evento `system.error` con código `INVALID_MESSAGE`.

## Decisiones de la Fase 1

1. **ESM en todo el monorepo** (`"type": "module"`). Server y shared usan `moduleResolution: NodeNext` (imports relativos con extensión `.js`); el cliente usa `Bundler` (resolución de Vite).
2. **npm workspaces** con dependencia `@robbie/shared: "*"`, enlazada por symlink. El orden de compilación es explícito en los scripts raíz (`shared` → `server` → `client`).
3. **Express 4** por estabilidad del ecosistema. **Zod 3** por su API madura y documentada.
4. **Sin dotenv**: Node >= 20.12 carga `.env` nativamente (`process.loadEnvFile`).
5. **TypeScript estricto** en todos los paquetes (`strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, ...).
6. **Vitest** con tests colocados junto al código (`*.test.ts`), excluidos de la compilación de producción mediante `tsconfig.build.json` dedicado en cada paquete compilable.
7. **ESLint 9** con configuración plana en la raíz (`eslint.config.js`).

## Pospuesto para fases futuras

Motor completo de expresiones de Robbie (Fase 3), Ollama e IA, voz, Pomodoro, notas/tareas/recordatorios, SQLite (el directorio `data/` queda reservado), empaquetado con Tauri, ESP32, Bluetooth, WiFi entre dispositivos, GSM y APIs externas.
