import { createServer } from 'node:http';
import { createApp } from './app.js';
import { loadConfig, loadRootEnvFile } from './config.js';
import { createWebSocketServer, broadcast } from './websocket.js';
import { PomodoroTimerService } from './pomodoro/service.js';
import { initDb, closeDb } from './pomodoro/db.js';
import type { WebSocketEvent } from '@robbie/shared';
import type { PomodoroEvent } from './pomodoro/service.js';

function log(message: string): void {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

loadRootEnvFile();
const config = loadConfig();

const server = createServer();

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    log(`Error: el puerto ${config.PORT} ya está en uso en ${config.HOST}.`);
    log(`Cierra el proceso que lo ocupa (lsof -i :${config.PORT}) o cambia PORT en .env.`);
    process.exit(1);
  }
  if (error.code === 'EACCES') {
    log(`Error: sin permisos para escuchar en el puerto ${config.PORT}. Usa un puerto mayor que 1024.`);
    process.exit(1);
  }
  throw error;
});

const wss = createWebSocketServer(server, config);

wss.on('error', (error: Error) => {
  log(`Error del servidor WebSocket: ${error.message}`);
});

function toWsEvent(event: PomodoroEvent): WebSocketEvent {
  return { type: event.type as WebSocketEvent['type'], payload: event.payload as WebSocketEvent['payload'] } as WebSocketEvent;
}

async function start(): Promise<void> {
  await initDb();

  const pomodoroService = new PomodoroTimerService((pomodoroEvent) => {
    broadcast(wss, toWsEvent(pomodoroEvent));
  });

  const app = createApp(config, pomodoroService);
  server.on('request', app);

  server.listen(config.PORT, config.HOST, () => {
    log(`robbie-server escuchando en http://${config.HOST}:${config.PORT} (entorno: ${config.NODE_ENV})`);
    log(`WebSocket disponible en ws://${config.HOST}:${config.PORT}/ws`);
    log(`Origen del cliente permitido: ${config.CLIENT_ORIGIN}`);
  });
}

start().catch((error) => {
  log(`Error al iniciar el servidor: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

let shuttingDown = false;

function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  log(`Señal ${signal} recibida. Cerrando el servidor...`);

  closeDb().catch(() => {});

  for (const client of wss.clients) {
    client.close(1001, 'Servidor detenido');
  }
  wss.close();

  server.close(() => {
    log('Servidor cerrado correctamente.');
    process.exit(0);
  });

  setTimeout(() => {
    log('Tiempo de cierre agotado. Saliendo de forma forzada.');
    process.exit(1);
  }, 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
