import { parseWebSocketEvent, type WebSocketEvent } from '@robbie/shared';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export interface ConnectionCallbacks {
  onStatusChange(status: ConnectionStatus): void;
  onEvent(event: WebSocketEvent): void;
}

/** Espera progresiva limitada: 1s, 2s, 4s, 8s y un tope de 10s. */
const RECONNECT_DELAYS_MS = [1000, 2000, 4000, 8000];
const MAX_RECONNECT_DELAY_MS = 10_000;

/**
 * Cliente WebSocket con reconexión automática.
 * Todos los mensajes entrantes se validan con los esquemas Zod compartidos.
 */
export class RobbieConnection {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private intentionalClose = false;

  constructor(
    private readonly url: string,
    private readonly callbacks: ConnectionCallbacks,
  ) {}

  connect(): void {
    this.intentionalClose = false;
    this.openSocket();
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.clearReconnectTimer();
    this.socket?.close();
  }

  send(event: WebSocketEvent): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(event));
    }
  }

  private openSocket(): void {
    this.callbacks.onStatusChange('connecting');
    this.socket = new WebSocket(this.url);

    this.socket.addEventListener('open', () => {
      this.reconnectAttempts = 0;
      this.callbacks.onStatusChange('connected');
    });

    this.socket.addEventListener('message', (message: MessageEvent) => {
      let data: unknown;
      try {
        data = JSON.parse(String(message.data));
      } catch {
        return; // Mensaje no JSON: se descarta silenciosamente.
      }
      const result = parseWebSocketEvent(data);
      if (result.success) {
        this.callbacks.onEvent(result.event);
      }
    });

    this.socket.addEventListener('close', () => {
      this.callbacks.onStatusChange('disconnected');
      if (!this.intentionalClose) {
        this.scheduleReconnect();
      }
    });
  }

  private scheduleReconnect(): void {
    const baseDelay =
      RECONNECT_DELAYS_MS[Math.min(this.reconnectAttempts, RECONNECT_DELAYS_MS.length - 1)] ??
      MAX_RECONNECT_DELAY_MS;
    const delay = Math.min(baseDelay, MAX_RECONNECT_DELAY_MS);
    this.reconnectAttempts += 1;
    this.reconnectTimer = window.setTimeout(() => {
      this.openSocket();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
