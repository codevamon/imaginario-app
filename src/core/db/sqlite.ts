// src/core/sqlite.ts
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

const sqlite = new SQLiteConnection(CapacitorSQLite);
const DB_NAME = 'imaginario';

const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS _meta ( key TEXT PRIMARY KEY, value TEXT );
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY, display_name TEXT, avatar_url TEXT, settings_json TEXT,
  updated_at INTEGER NOT NULL, deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON profiles(updated_at);

CREATE TABLE IF NOT EXISTS imaginarios (
  id TEXT PRIMARY KEY, owner_id TEXT, title TEXT, body TEXT, tags TEXT, image_url TEXT,
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_imaginarios_updated_at ON imaginarios(updated_at);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY, imag_id TEXT NOT NULL, user_id TEXT, body TEXT,
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER,
  FOREIGN KEY (imag_id) REFERENCES imaginarios(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_comments_imag ON comments(imag_id);
CREATE INDEX IF NOT EXISTS idx_comments_updated_at ON comments(updated_at);

CREATE TABLE IF NOT EXISTS likes (
  id TEXT PRIMARY KEY, imag_id TEXT NOT NULL, user_id TEXT NOT NULL,
  updated_at INTEGER NOT NULL, deleted_at INTEGER,
  UNIQUE (imag_id, user_id),
  FOREIGN KEY (imag_id) REFERENCES imaginarios(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_likes_imag ON likes(imag_id);
CREATE INDEX IF NOT EXISTS idx_likes_updated_at ON likes(updated_at);

CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY, event TEXT NOT NULL, meta_json TEXT, created_at INTEGER NOT NULL
);
`;

const SCHEMA_V2 = `
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

-- === Catálogo pull-only ===
CREATE TABLE IF NOT EXISTS birds (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  rarity INTEGER DEFAULT 0,
  popularity INTEGER DEFAULT 0,
  tags TEXT,
  image_url TEXT,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_birds_updated_at ON birds(updated_at);
CREATE INDEX IF NOT EXISTS idx_birds_rarity ON birds(rarity);
CREATE INDEX IF NOT EXISTS idx_birds_popularity ON birds(popularity);

CREATE TABLE IF NOT EXISTS musicians (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  bio TEXT,
  tags TEXT,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_musicians_updated_at ON musicians(updated_at);

CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  bird_id TEXT,
  title TEXT,
  audio_url TEXT,
  duration_ms INTEGER,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  FOREIGN KEY (bird_id) REFERENCES birds(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_tracks_bird ON tracks(bird_id);
CREATE INDEX IF NOT EXISTS idx_tracks_updated_at ON tracks(updated_at);

CREATE TABLE IF NOT EXISTS interviews (
  id TEXT PRIMARY KEY,
  bird_id TEXT,
  title TEXT,
  audio_url TEXT,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  FOREIGN KEY (bird_id) REFERENCES birds(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_interviews_bird ON interviews(bird_id);
CREATE INDEX IF NOT EXISTS idx_interviews_updated_at ON interviews(updated_at);

-- === Favoritos locales (reflejo offline del estado) ===
CREATE TABLE IF NOT EXISTS favorites_local (
  id TEXT PRIMARY KEY,
  bird_id TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  UNIQUE (bird_id)
);
CREATE INDEX IF NOT EXISTS idx_fav_local_updated ON favorites_local(updated_at);
`;


async function ensureWebSqliteReady() {
  if (Capacitor.getPlatform() === 'web') {
    const el = document.querySelector('jeep-sqlite') as any;
    await el?.componentOnReady?.();
    // Inicializa el store web y sincroniza el pool de conexiones
    try { await CapacitorSQLite.initWebStore(); } catch {}
    try { await sqlite.checkConnectionsConsistency(); } catch {}
  }
}
async function getOrCreateConnection(): Promise<SQLiteDBConnection> {
  await ensureWebSqliteReady();

  // Recupera si ya existe; si no, crea con el modo correcto 'no-encryption'
  const has = await sqlite.isConnection(DB_NAME, false).catch(() => ({ result: false }));
  const db = has?.result
    ? await sqlite.retrieveConnection(DB_NAME, false)
    : await sqlite.createConnection(DB_NAME, false, 'no-encryption', 2, false);

  // Abre SIEMPRE antes de usar
  await db.open();
  return db;
}

async function applyPragmas(db: SQLiteDBConnection) {
  try { await db.run('PRAGMA journal_mode=WAL;'); } catch {}
  try { await db.run('PRAGMA foreign_keys=ON;'); } catch {}
}

async function getMeta(db: SQLiteDBConnection, key: string): Promise<string | null> {
  const r = await db.query('SELECT value FROM _meta WHERE key = ?', [key]);
  return r.values?.[0]?.value ?? null;
}
async function setMeta(db: SQLiteDBConnection, key: string, value: string) {
  await db.run(
    'INSERT INTO _meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
    [key, value]
  );
}

async function migrateToV2(db: SQLiteDBConnection) {
  await db.execute(SCHEMA_V2);
  await setMeta(db, 'schema_version', '2');
  // En web, guarda en el IndexedDB backing store
  try { await sqlite.saveToStore(DB_NAME); } catch {}
}


export async function getDb(): Promise<SQLiteDBConnection> {
  const db = await getOrCreateConnection();
  await applyPragmas(db);
  await db.execute(`CREATE TABLE IF NOT EXISTS _meta (key TEXT PRIMARY KEY, value TEXT);`);
  const ver = await getMeta(db, 'schema_version');
  if (!ver) {
    await db.execute(SCHEMA_V1);
    await setMeta(db, 'schema_version', '1');
    try { await sqlite.saveToStore(DB_NAME); } catch {}
  }
  if (ver === '1') {
    await migrateToV2(db);
  }
  return db;
}

// ✅ helpers que usan los servicios de sync
export async function getMetaValue(key: string) {
  const db = await getDb();
  return getMeta(db, key);
}
export async function setMetaValue(key: string, value: string) {
  const db = await getDb();
  return setMeta(db, key, value);
}

export function uid(): string {
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}


export async function saveWebStore() {
  if (Capacitor.getPlatform() === 'web') {
    try { await sqlite.saveToStore(DB_NAME); } catch {}
  }
}