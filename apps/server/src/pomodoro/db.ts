import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '..', '..', '..', '..', 'data');
let database: SqlJsDatabase | undefined;
let customDbPath: string | undefined;

export function setDbPath(path: string): void {
  customDbPath = path;
}

function getDbPath(): string {
  return customDbPath ?? process.env.POMODORO_DB_PATH ?? join(DATA_DIR, 'pomodoro.db');
}

function getDirPath(filePath: string): string {
  const lastSep = filePath.lastIndexOf('/');
  return lastSep >= 0 ? filePath.slice(0, lastSep) : '.';
}

function save(): void {
  if (!database) return;
  const data = database.export();
  writeFileSync(getDbPath(), Buffer.from(data));
}

async function initializeDatabase(): Promise<SqlJsDatabase> {
  const SQL = await initSqlJs();

  const dir = getDirPath(getDbPath());
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  if (existsSync(getDbPath())) {
    const buffer = readFileSync(getDbPath());
    database = new SQL.Database(buffer);
  } else {
    database = new SQL.Database();
  }

  database.run('PRAGMA journal_mode = WAL');
  runMigrations(database);
  save();

  return database;
}

function runMigrations(database: SqlJsDatabase): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS pomodoro_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      focus_duration_seconds INTEGER NOT NULL DEFAULT 1500,
      short_break_duration_seconds INTEGER NOT NULL DEFAULT 300,
      long_break_duration_seconds INTEGER NOT NULL DEFAULT 900,
      long_break_interval INTEGER NOT NULL DEFAULT 4,
      sound_enabled INTEGER NOT NULL DEFAULT 1,
      notifications_enabled INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pomodoro_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mode TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL,
      started_at TEXT,
      ends_at TEXT,
      paused_at TEXT,
      remaining_seconds INTEGER NOT NULL DEFAULT 0,
      completed_sessions INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'ready',
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT OR IGNORE INTO pomodoro_settings (id) VALUES (1);
  `);
}

let initPromise: Promise<SqlJsDatabase> | undefined;

export function getDb(): SqlJsDatabase {
  if (!database) throw new Error('Base de datos no inicializada. Llama a initDb() primero.');
  return database;
}

export async function initDb(): Promise<SqlJsDatabase> {
  if (!initPromise) {
    initPromise = initializeDatabase();
  }
  return initPromise;
}

export function saveDb(): void {
  save();
}

export async function closeDb(): Promise<void> {
  if (database) {
    save();
    database.close();
    database = undefined;
    initPromise = undefined;
  }
}
