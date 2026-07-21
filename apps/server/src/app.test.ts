import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { loadConfig } from './config.js';

const app = createApp(loadConfig({}));

describe('GET /', () => {
  it('responde 200 con la información del servicio', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      service: 'robbie-server',
      status: 'ok',
      client: 'http://localhost:5173',
      health: '/api/health',
    });
  });
});

describe('GET /api/health', () => {
  it('responde 200 con el estado del servicio', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      service: 'robbie-server',
    });
    expect(typeof res.body.timestamp).toBe('string');
    expect(Number.isNaN(Date.parse(res.body.timestamp))).toBe(false);
  });

  it('incluye la cabecera CORS para el cliente configurado', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('no expone la cabecera x-powered-by', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('rutas no registradas', () => {
  it('responde un 404 estructurado', async () => {
    const res = await request(app).get('/api/no-existe');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: expect.stringContaining('/api/no-existe'),
      },
    });
  });
});
