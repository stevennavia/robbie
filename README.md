# Robbie Virtual

Asistente de escritorio local para macOS. Estado actual del proyecto:

- **Fase 1**: arquitectura base (monorepo con cliente web, servidor local y tipos compartidos).
- **Fase 2**: diseño visual del MVP — Robbie renderizado en el cliente con una carcasa marfil, pantalla 2:1 con ojos luminosos en Canvas 2D, rejilla de parlante, botón superior, modos completo/compacto y panel temporal de estados.

> Fases futuras (aún no implementadas): motor de expresiones, Ollama/IA, voz, Pomodoro, notas, tareas, recordatorios, SQLite, Tauri, ESP32, Bluetooth, WiFi entre dispositivos, GSM y APIs externas.

## Requisitos

- **Node.js** >= 20.12 (desarrollado con Node 26)
- **npm** >= 10
- macOS (también debería funcionar en Linux y Windows)

## Estructura del proyecto

```
robbie/
  apps/
    client/        # Interfaz web (Vite + TypeScript, sin frameworks)
      src/
        robbie/    # Vista de Robbie: ojos, estados visuales y transición de brillo
        styles/    # CSS modular: base, layout, robbie, tray
        ui/        # Componentes de interfaz (panel de desarrollo)
    server/        # Servidor local (Express + WebSocket)
  packages/
    shared/        # Tipos y esquemas Zod compartidos (@robbie/shared)
  data/            # Datos locales (reservado para fases futuras)
  docs/            # Documentación técnica
```

## Instalación

```bash
npm install
```

Repositorio: [github.com/stevennavia/robbieeyes](https://github.com/stevennavia/robbieeyes)

Opcionalmente, copia el archivo de entorno para personalizar la configuración:

```bash
cp .env.example .env
```

## Cómo ejecutar

Inicia cliente y servidor a la vez (modo desarrollo, con recarga automática):

```bash
npm run dev
```

Después abre **http://localhost:5173** en el navegador.

### Modos de visualización

- **Modo completo** (por defecto): Robbie, navegación, bandeja lateral con las secciones y el panel temporal de estados.
- **Modo compacto**: solo Robbie, su estado y la acción principal. Se activa con el botón «Modo compacto» del encabezado o con `http://localhost:5173/?mode=compact`. La elección se guarda en `localStorage`.

## Puertos usados

| Puerto | Servicio |
|--------|----------|
| `5173` | Cliente web (Vite) |
| `3001` | Servidor HTTP (API REST) + WebSocket (`/ws`) |

Endpoints disponibles:

- `GET http://localhost:3001/` → información del servicio (JSON orientativo)
- `GET http://localhost:3001/api/health` → estado del servidor
- `ws://localhost:3001/ws` → canal de eventos en tiempo real

> La interfaz visual de Robbie está en **http://localhost:5173**. El puerto 3001 es solo la API: cualquier otra ruta no registrada responde con un 404 estructurado.

## Comandos disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia cliente y servidor al mismo tiempo |
| `npm run dev:client` | Inicia solo el cliente |
| `npm run dev:server` | Inicia solo el servidor (compila `shared` antes) |
| `npm run build` | Compila los tres paquetes (`shared` → `server` → `client`) |
| `npm run test` | Ejecuta las pruebas con Vitest |
| `npm run typecheck` | Verifica los tipos de TypeScript en todos los paquetes |
| `npm run lint` | Ejecuta ESLint sobre todo el repositorio |

## Variables de entorno

Definidas en `.env` (ver `.env.example`):

| Variable | Valor por defecto | Descripción |
|----------|-------------------|-------------|
| `PORT` | `3001` | Puerto del servidor |
| `HOST` | `localhost` | Host de escucha |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Origen permitido (CORS y WebSocket) |
| `NODE_ENV` | `development` | Entorno (`development`, `test`, `production`) |

## Problemas comunes

- **`Cannot find module '@robbie/shared'`**: el paquete compartido no está compilado. Ejecuta `npm run build -w @robbie/shared` (los scripts `dev`, `test` y `typecheck` ya lo hacen automáticamente).
- **El servidor no arranca: "el puerto 3001 ya está en uso"**: otro proceso ocupa el puerto. Encuéntralo con `lsof -i :3001` y ciérralo, o cambia `PORT` en `.env`.
- **El cliente muestra "Servidor desconectado"**: comprueba que el servidor esté corriendo (`npm run dev:server`) y que el puerto `3001` no esté ocupado por otro proceso (`lsof -i :3001`).
- **"Conexión rechazada: origen no permitido" en el servidor**: el valor de `CLIENT_ORIGIN` en `.env` no coincide con la URL del cliente. Si cambias el puerto de Vite, actualiza también `CLIENT_ORIGIN`.
- **Cambios en `packages/shared` no se reflejan en el servidor**: `tsc --watch` recompila `shared`, pero el servidor no se reinicia solo ante ese cambio. Reinicia `npm run dev`.
- **El puerto 5173 está ocupado**: Vite está configurado con `strictPort`. Libera el puerto (`lsof -i :5173`) o cámbialo en `apps/client/vite.config.ts` y en `CLIENT_ORIGIN`.

## Documentación adicional

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): decisiones de arquitectura y flujo de datos.
