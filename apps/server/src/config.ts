import { fileURLToPath } from 'node:url';
import { z } from 'zod';

/**
 * Esquema de configuración del servidor. Todos los valores llegan como
 * variables de entorno (cadenas de texto) y Zod los valida y transforma.
 */
const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('localhost'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
});

export type AppConfig = z.infer<typeof configSchema>;

/**
 * Valida las variables de entorno y devuelve la configuración tipada.
 * Lanza un Error descriptivo si alguna variable es inválida.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = configSchema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Configuración inválida:\n${issues}`);
  }
  return result.data;
}

/**
 * Carga el archivo `.env` de la raíz del monorepo si existe.
 * Es opcional: en su ausencia se usan los valores por defecto del esquema.
 */
export function loadRootEnvFile(): void {
  try {
    process.loadEnvFile(fileURLToPath(new URL('../../../.env', import.meta.url)));
  } catch {
    // El archivo .env es opcional; se ignoran los errores de lectura.
  }
}
