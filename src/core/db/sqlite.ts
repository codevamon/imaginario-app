import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

const sqlite = new SQLiteConnection(CapacitorSQLite);
const DB_NAME = 'imaginario';

const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS _meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  settings_json TEXT,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON profiles(updated_at);

CREATE TABLE IF NOT EXISTS imaginarios (
  id TEXT PRIMARY KEY,
  owner_id TEXT,
  title TEXT,
  body TEXT,
  tags TEXT,
  image_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_imaginarios_updated_at ON imaginarios(updated_at);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  imag_id TEXT NOT NULL,
  user_id TEXT,
  body TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  FOREIGN KEY (imag_id) REFERENCES imaginarios(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_comments_imag ON comments(imag_id);
CREATE INDEX IF NOT EXISTS idx_comments_updated_at ON comments(updated_at);

CREATE TABLE IF NOT EXISTS likes (
  id TEXT PRIMARY KEY,
  imag_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  UNIQUE (imag_id, user_id),
  FOREIGN KEY (imag_id) REFERENCES imaginarios(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_likes_imag ON likes(imag_id);
CREATE INDEX IF NOT EXISTS idx_likes_updated_at ON likes(updated_at);

CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  event TEXT NOT NULL,
  meta_json TEXT,
  created_at INTEGER NOT NULL
);
`;

async function getOrCreateConnection(): Promise<SQLiteDBConnection> {
  const has = await sqlite.isConnection(DB_NAME, false).catch(() => ({ result: false }));
  if (has?.result) {
    return sqlite.retrieveConnection(DB_NAME, false);
  }
  const db = await sqlite.createConnection(DB_NAME, false, 'noEncryption', 1, false);
  await db.open();
  return db;
}

async function applyPragmas(db: SQLiteDBConnection) {
  // Ejecuta PRAGMA fuera de transacciones
  try { await db.run('PRAGMA journal_mode=WAL;'); } catch {}
  try { await db.run('PRAGMA foreign_keys=ON;'); } catch {}
}

async function getMeta(db: SQLiteDBConnection, key: string): Promise<string | null> {
  const r = await db.query('SELECT value FROM _meta WHERE key = ?', [key]);
  return r.values?.[0]?.value ?? null;
}

async function setMeta(db: SQLiteDBConnection, key: string, value: string) {
  await db.run('INSERT INTO _meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [key, value]);
}

export async function getDb(): Promise<SQLiteDBConnection> {
  const db = await getOrCreateConnection();
  await applyPragmas(db);
  await db.execute(`CREATE TABLE IF NOT EXISTS _meta (key TEXT PRIMARY KEY, value TEXT);`);
  const ver = await getMeta(db, 'schema_version');
  if (!ver) {
    await db.execute(SCHEMA_V1);
    await setMeta(db, 'schema_version', '1');
  }
  return db;
}

export function uid(): string {
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}
