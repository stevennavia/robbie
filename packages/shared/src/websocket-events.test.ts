import { describe, expect, it } from 'vitest';
import { parseWebSocketEvent, webSocketEventSchema } from './websocket-events.js';

describe('webSocketEventSchema', () => {
  it('valida connection.ready', () => {
    const event = { type: 'connection.ready', payload: { connected: true } };
    expect(webSocketEventSchema.safeParse(event).success).toBe(true);
  });

  it('valida robbie.state.changed con previousState', () => {
    const event = {
      type: 'robbie.state.changed',
      payload: { state: 'focus', previousState: 'idle' },
    };
    expect(webSocketEventSchema.safeParse(event).success).toBe(true);
  });

  it('valida robbie.state.changed sin previousState', () => {
    const event = { type: 'robbie.state.changed', payload: { state: 'thinking' } };
    expect(webSocketEventSchema.safeParse(event).success).toBe(true);
  });

  it('valida system.error', () => {
    const event = {
      type: 'system.error',
      payload: { error: { code: 'INTERNAL_ERROR', message: 'fallo inesperado' } },
    };
    expect(webSocketEventSchema.safeParse(event).success).toBe(true);
  });

  it('valida system.error con details opcionales', () => {
    const event = {
      type: 'system.error',
      payload: {
        error: { code: 'INVALID_MESSAGE', message: 'mensaje inválido', details: [{ path: 'type' }] },
      },
    };
    expect(webSocketEventSchema.safeParse(event).success).toBe(true);
  });

  it('rechaza un tipo de evento desconocido', () => {
    const event = { type: 'robbie.deleted', payload: {} };
    expect(webSocketEventSchema.safeParse(event).success).toBe(false);
  });

  it('rechaza un payload con tipos incorrectos', () => {
    const event = { type: 'connection.ready', payload: { connected: 'yes' } };
    expect(webSocketEventSchema.safeParse(event).success).toBe(false);
  });

  it('rechaza un evento sin payload', () => {
    expect(webSocketEventSchema.safeParse({ type: 'connection.ready' }).success).toBe(false);
  });

  it('rechaza un estado inválido dentro de robbie.state.changed', () => {
    const event = { type: 'robbie.state.changed', payload: { state: 'dormido' } };
    expect(webSocketEventSchema.safeParse(event).success).toBe(false);
  });
});

describe('parseWebSocketEvent', () => {
  it('devuelve el evento tipado cuando el mensaje es válido', () => {
    const result = parseWebSocketEvent({
      type: 'connection.ready',
      payload: { connected: true },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.event.type).toBe('connection.ready');
    }
  });

  it('devuelve un error Zod cuando el mensaje es inválido', () => {
    const result = parseWebSocketEvent('esto no es un evento');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });
});
