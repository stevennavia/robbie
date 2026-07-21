import { createServer } from 'node:http';
import { createApp } from './app.js';
import { loadConfig, loadRootEnvFile } from './config.js';
import { createWebSocketServer } from './websocket.js';

function log(message: string): void {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

loadRootEnvFile();
const config = loadConfig();

const app = createApp(config);
const server = createServer(app);

// Errores de arranque con mensajes claros. Este listener se registra ANTES
// de crear el WebSocketServer para que se ejecute primero y salga limpio.
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

// ws re-emite los errores del servidor HTTP en la instancia de WebSocketServer;
// sin este listener el proceso moriría con "Unhandled 'error' event".
wss.on('error', (error: Error) => {
  log(`Error del servidor WebSocket: ${error.message}`);
});

server.listen(config.PORT, config.HOST, () => {
  log(`robbie-server escuchando en http://${config.HOST}:${config.PORT} (entorno: ${config.NODE_ENV})`);
  log(`WebSocket disponible en ws://${config.HOST}:${config.PORT}/ws`);
  log(`Origen del cliente permitido: ${config.CLIENT_ORIGIN}`);
});

let shuttingDown = false;

function shutdown(signal: string): void {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  log(`Señal ${signal} recibida. Cerrando el servidor...`);

  for (const client of wss.clients) {
    client.close(1001, 'Servidor detenido');
  }
  wss.close();

  server.close(() => {
    log('Servidor cerrado correctamente.');
    process.exit(0);
  });

  // Salida forzada si alguna conexión no se cierra a tiempo.
  setTimeout(() => {
    log('Tiempo de cierre agotado. Saliendo de forma forzada.');
    process.exit(1);
  }, 5000).unref();
}

process.on('SIGINT', () => {
  shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});
