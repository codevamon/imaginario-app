import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite'
import { Capacitor } from '@capacitor/core'

// Configuración centralizada de la base de datos
const DB_CONFIG = {
  name: 'imaginario',
  encrypted: false,
  mode: 'no-encryption',
  version: 1,
  readonly: false
} as const;

let sqlite: SQLiteConnection | null = null
let db: SQLiteDBConnection | null = null
let dbInitialized = false
let schemaInitialized = false

/**
 * Inicializa la base de datos SQLite con gestión inteligente de conexiones
 */
export async function initDb(): Promise<SQLiteDBConnection> {
  // Verificar si estamos en modo web y usar DB fake
  if (Capacitor.getPlatform() === 'web') {
    console.warn('[sqlite] 🚨 Modo web: usando DB fake (sin persistencia)')
    dbInitialized = true
    schemaInitialized = true

    const fakeDb = {
      query: async () => ({ values: [] }),
      run: async () => ({ changes: { changes: 0 } }),
      execute: async () => ({ changes: { changes: 0 } }),
      executeSet: async () => ({ changes: { changes: 0 } }),
    } as unknown as SQLiteDBConnection

    db = fakeDb
    return db
  }

  console.log('[sqlite] 🚀 Inicializando base de datos (nativo)')

  try {
    // Crear SQLiteConnection si no existe
    if (!sqlite) {
      sqlite = new SQLiteConnection(CapacitorSQLite)
      console.log('[sqlite] ✅ SQLiteConnection creada')
    }

    // Verificar si ya existe una conexión activa
    const isConnected = await sqlite.isConnection(DB_CONFIG.name, DB_CONFIG.readonly)
    
    if (isConnected.result) {
      console.log('[sqlite] 🔄 Reutilizando conexión existente')
      db = await sqlite.retrieveConnection(DB_CONFIG.name, DB_CONFIG.readonly)
    } else {
      console.log('[sqlite] 📝 Creando nueva conexión')
      db = await sqlite.createConnection(
        DB_CONFIG.name,
        DB_CONFIG.encrypted,
        DB_CONFIG.mode,
        DB_CONFIG.version,
        DB_CONFIG.readonly
      )
      await db.open()
      console.log('[sqlite] ✅ Conexión abierta a', DB_CONFIG.name)
    }

    // Inicializar esquema solo si no se ha hecho antes
    if (!schemaInitialized) {
      await initializeSchema()
      schemaInitialized = true
    }
    
    dbInitialized = true
    if (!db) throw new Error('[sqlite] ❌ DB not initialized')
    return db
  } catch (err) {
    console.error('[sqlite] ❌ Error inicializando base de datos:', err)
    throw err
  }
}

/**
 * Inicializa el esquema de la base de datos
 */
async function initializeSchema() {
  if (!db) throw new Error('Base de datos no inicializada')

  console.log('[sqlite] 📋 Inicializando esquema de base de datos...')

  // Tabla de metadatos
  await db.execute(`
    CREATE TABLE IF NOT EXISTS _meta (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `)
  console.log('[sqlite] ✅ Tabla _meta creada/verificada')

  // Tabla de activity_log
  await db.execute(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      level TEXT NOT NULL CHECK(level IN ('info', 'warn', 'error')),
      category TEXT NOT NULL CHECK(category IN ('sync', 'error', 'user_action')),
      message TEXT NOT NULL,
      details TEXT,
      table_name TEXT,
      record_count INTEGER
    )
  `)
  console.log('[sqlite] ✅ Tabla activity_log creada/verificada')

  // Tabla de birds (catálogo principal)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS birds (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      scientific_name TEXT,
      rarity INTEGER,
      popularity INTEGER,
      tags TEXT,
      image_url TEXT,
      audio_url TEXT,
      updated_at INTEGER,
      deleted_at INTEGER
    )
  `)
  console.log('[sqlite] ✅ Tabla birds creada/verificada')

  // Tabla de favoritos locales
  await db.execute(`
    CREATE TABLE IF NOT EXISTS favorites_local (
      id TEXT PRIMARY KEY,
      bird_id TEXT UNIQUE NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER
    )
  `)
  console.log('[sqlite] ✅ Tabla favorites_local creada/verificada')

  // Tabla de bird_images
  await db.execute(`
    CREATE TABLE IF NOT EXISTS bird_images (
      id TEXT PRIMARY KEY,
      bird_id TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT,
      updated_at INTEGER,
      deleted_at INTEGER
    )
  `)
  console.log('[sqlite] ✅ Tabla bird_images creada/verificada')

  // Tabla de bird_translations
  await db.execute(`
    CREATE TABLE IF NOT EXISTS bird_translations (
      id TEXT PRIMARY KEY,
      bird_id TEXT NOT NULL,
      lang TEXT NOT NULL,
      description TEXT,
      audio_url TEXT,
      updated_at INTEGER,
      deleted_at INTEGER
    )
  `)
  console.log('[sqlite] ✅ Tabla bird_translations creada/verificada')

  // Tabla de sings
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sings (
      id TEXT PRIMARY KEY,
      bird_id TEXT NOT NULL,
      title TEXT,
      audio_url TEXT NOT NULL,
      duration_ms INTEGER,
      updated_at INTEGER,
      deleted_at INTEGER
    )
  `)
  console.log('[sqlite] ✅ Tabla sings creada/verificada')

  // Tabla de tracks
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tracks (
      id TEXT PRIMARY KEY,
      bird_id TEXT NOT NULL,
      title TEXT,
      audio_url TEXT,
      duration_ms INTEGER,
      updated_at INTEGER,
      deleted_at INTEGER
    )
  `)
  console.log('[sqlite] ✅ Tabla tracks creada/verificada')

  // Tabla de interviews
  await db.execute(`
    CREATE TABLE IF NOT EXISTS interviews (
      id TEXT PRIMARY KEY,
      bird_id TEXT NOT NULL,
      title TEXT,
      audio_url TEXT,
      updated_at INTEGER,
      deleted_at INTEGER
    )
  `)
  console.log('[sqlite] ✅ Tabla interviews creada/verificada')

  // Tabla de musicians
  await db.execute(`
    CREATE TABLE IF NOT EXISTS musicians (
      id TEXT PRIMARY KEY,
      bird_id TEXT NOT NULL,
      name TEXT NOT NULL,
      bio TEXT,
      updated_at INTEGER,
      deleted_at INTEGER
    )
  `)
  console.log('[sqlite] ✅ Tabla musicians creada/verificada')

  // Tabla de imaginarios
  await db.execute(`
    CREATE TABLE IF NOT EXISTS imaginarios (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      tags TEXT,
      image_url TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER
    )
  `)
  console.log('[sqlite] ✅ Tabla imaginarios creada/verificada')

  // Índices para activity_log
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp 
    ON activity_log(timestamp DESC)
  `)
  
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_activity_log_category 
    ON activity_log(category, timestamp DESC)
  `)
  console.log('[sqlite] ✅ Índices de activity_log creados/verificados')

  // Índices para birds
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_birds_popularity 
    ON birds(popularity DESC, updated_at DESC)
  `)
  
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_birds_deleted 
    ON birds(deleted_at)
  `)
  console.log('[sqlite] ✅ Índices de birds creados/verificados')

  console.log('[sqlite] ✅ Esquema de base de datos inicializado completamente')
}

export async function getDb(): Promise<SQLiteDBConnection> {
  if (dbInitialized && db) return db
  const result = await initDb()
  if (!result) throw new Error('[sqlite] ❌ DB not initialized')
  return result
}

/**
 * Cierra la conexión actual y limpia el estado
 */
export async function closeDb() {
  try {
    if (sqlite && db) {
      await sqlite.closeConnection(DB_CONFIG.name, DB_CONFIG.readonly)
      console.log('[sqlite] 🔒 Conexión cerrada')
    }
  } catch (err) {
    console.warn('[sqlite] ⚠️ Error cerrando conexión:', err)
  } finally {
    db = null
    dbInitialized = false
    // No resetear schemaInitialized para evitar recrear tablas
  }
}

/**
 * Reinicia la base de datos y limpia todas las tablas sincronizadas
 */
export async function resetDb(): Promise<SQLiteDBConnection> {
  // Verificar si estamos en modo web y ignorar reset
  if (Capacitor.getPlatform() === 'web') {
    console.warn('[sqlite] 🚨 resetDb ignorado en modo web');
    // Retornar el fake DB que ya está configurado
    if (!db) throw new Error('[sqlite] ❌ DB not initialized');
    return db;
  }

  console.log('[sqlite] 🔄 Reiniciando base de datos...')
  await closeDb()
  const newDb = await initDb()
  
  if (!newDb) throw new Error('[sqlite] ❌ DB not initialized')
  
  // Borra todo el contenido de tablas sincronizadas
  const tables = ['birds', 'bird_images', 'bird_translations', 'sings', 'tracks', 'interviews', 'musicians']
  for (const t of tables) {
    await newDb.run(`DELETE FROM ${t}`)
  }

  // Borra metadatos de sincronización (para que todo se repoble desde Supabase)
  await newDb.run(`DELETE FROM _meta`)

  console.log('[sqlite] ⚡ resetDb completado. Todas las tablas y metadatos están vacíos.')
  
  return newDb
}

/**
 * Verifica si la base de datos está inicializada
 */
export function isDbReady(): boolean {
  return dbInitialized && db !== null
}

/**
 * Verifica si el esquema está inicializado
 */
export function isSchemaReady(): boolean {
  return schemaInitialized
}

/**
 * Obtiene información del estado de la conexión
 */
export function getConnectionStatus() {
  return {
    sqliteReady: sqlite !== null,
    dbReady: dbInitialized && db !== null,
    schemaReady: schemaInitialized,
    connectionName: DB_CONFIG.name
  }
}

// Funciones auxiliares para metadatos
export async function getMetaValue(key: string) {
  const dbConnection = await getDb();
  const r = await dbConnection.query('SELECT value FROM _meta WHERE key = ?', [key]);
  return r.values?.[0]?.value ?? null;
}

export async function setMetaValue(key: string, value: string) {
  const dbConnection = await getDb();
  await dbConnection.run(
    'INSERT INTO _meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
    [key, value]
  );
}

// Función para generar IDs únicos
export function uid(): string {
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}