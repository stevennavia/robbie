import type { IncomingMessage } from 'node:http';
import type { Server as HttpServer } from 'node:http';
import {
  ERROR_CODES,
  createApiError,
  parseWebSocketEvent,
  type SystemErrorEvent,
  type WebSocketEvent,
} from '@robbie/shared';
import { WebSocket, WebSocketServer } from 'ws';
import type { AppConfig } from './config.js';

function log(message: string): void {
  console.log(`[${new Date().toISOString()}] [ws] ${message}`);
}

function sendEvent(socket: WebSocket, event: WebSocketEvent): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(event));
  }
}

function sendSystemError(socket: WebSocket, code: string, message: string, details?: unknown): void {
  const event: SystemErrorEvent = {
    type: 'system.error',
    payload: { error: createApiError(code, message, details) },
  };
  sendEvent(socket, event);
}

function broadcast(wss: WebSocketServer, event: WebSocketEvent): void {
  const message = JSON.stringify(event);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

function isOriginAllowed(req: IncomingMessage, config: AppConfig): boolean {
  const origin = req.headers.origin;
  // Clientes sin cabecera Origin (herramientas locales) se permiten;
  // los navegadores siempre la envían y deben coincidir con el cliente configurado.
  return origin === undefined || origin === config.CLIENT_ORIGIN;
}

/**
 * Adjunta un servidor WebSocket (path /ws) al servidor HTTP existente.
 * Al conectarse, cada cliente recibe el evento `connection.ready`.
 */
export function createWebSocketServer(server: HttpServer, config: AppConfig): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (socket: WebSocket, req: IncomingMessage) => {
    if (!isOriginAllowed(req, config)) {
      log(`Conexión rechazada: origen no permitido (${req.headers.origin ?? 'desconocido'})`);
      socket.close(1008, 'Origen no permitido');
      return;
    }

    log(`Cliente conectado (${wss.clients.size} activos)`);

    sendEvent(socket, {
      type: 'connection.ready',
      payload: { connected: true },
    });

    socket.on('message', (raw: Buffer) => {
      let data: unknown;
      try {
        data = JSON.parse(raw.toString('utf-8'));
      } catch {
        sendSystemError(socket, ERROR_CODES.INVALID_MESSAGE, 'El mensaje no es JSON válido');
        return;
      }

      const result = parseWebSocketEvent(data);
      if (!result.success) {
        sendSystemError(socket, ERROR_CODES.INVALID_MESSAGE, 'Mensaje WebSocket inválido', result.error.issues);
        return;
      }

      if (result.event.type === 'robbie.state.changed') {
        broadcast(wss, result.event);
      }
    });

    socket.on('close', () => {
      log(`Cliente desconectado (${wss.clients.size} activos)`);
    });
  });

  return wss;
}
