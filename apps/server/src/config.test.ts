import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

describe('loadConfig', () => {
  it('acepta una configuración válida explícita', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: '4000',
      CLIENT_ORIGIN: 'http://localhost:5173',
    });
    expect(config).toEqual({
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: 4000,
      CLIENT_ORIGIN: 'http://localhost:5173',
    });
  });

  it('aplica los valores por defecto cuando no hay variables', () => {
    const config = loadConfig({});
    expect(config).toEqual({
      NODE_ENV: 'development',
      HOST: 'localhost',
      PORT: 3001,
      CLIENT_ORIGIN: 'http://localhost:5173',
    });
  });

  it('transforma el PORT de cadena a número', () => {
    const config = loadConfig({ PORT: '8080' });
    expect(config.PORT).toBe(8080);
  });

  it('rechaza un PORT no numérico', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/Configuración inválida/);
  });

  it('rechaza un PORT fuera de rango', () => {
    expect(() => loadConfig({ PORT: '70000' })).toThrow(/Configuración inválida/);
    expect(() => loadConfig({ PORT: '0' })).toThrow(/Configuración inválida/);
  });

  it('rechaza un CLIENT_ORIGIN que no es una URL válida', () => {
    expect(() => loadConfig({ CLIENT_ORIGIN: 'no-es-una-url' })).toThrow(/Configuración inválida/);
  });

  it('rechaza un NODE_ENV desconocido', () => {
    expect(() => loadConfig({ NODE_ENV: 'staging' })).toThrow(/Configuración inválida/);
  });

  it('rechaza un HOST vacío', () => {
    expect(() => loadConfig({ HOST: '' })).toThrow(/Configuración inválida/);
  });
});
