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

// Versión actual del esquema de base de datos
const CURRENT_SCHEMA_VERSION = 3;

let sqlite: SQLiteConnection | null = null
let db: SQLiteDBConnection | null = null
let dbInitialized = false
let schemaInitialized = false

/**
 * Reinicia completamente la base de datos eliminándola y recreándola
 */
async function resetDatabase(): Promise<void> {
  console.log('[sqlite] 🔄 Iniciando reinicio completo de base de datos...')
  
  try {
    // Cerrar conexión actual si existe
    if (sqlite && db) {
      await sqlite.closeConnection(DB_CONFIG.name, DB_CONFIG.readonly)
      console.log('[sqlite] ✅ Conexión cerrada')
    }
    
    // Eliminar la base de datos completamente
    if (sqlite) {
      await CapacitorSQLite.deleteDatabase({ database: DB_CONFIG.name })
      console.log('[sqlite] ✅ Base de datos eliminada')
    }
    
    // Resetear estado global
    db = null
    dbInitialized = false
    schemaInitialized = false
    
    console.log('[sqlite] ✅ Reinicio de base de datos completado')
  } catch (err) {
    console.error('[sqlite] ❌ Error durante reinicio de base de datos:', err)
    throw err
  }
}

/**
 * Aplica migraciones incrementales basadas en la versión actual
 */
async function applyMigrations(db: SQLiteDBConnection): Promise<void> {
  console.log('[sqlite] 📋 Iniciando sistema de migraciones...')
  
  try {
    // Crear tabla _meta si no existe
    await db.execute(`
      CREATE TABLE IF NOT EXISTS _meta (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `)
    console.log('[sqlite] ✅ Tabla _meta creada/verificada')
    
    // Obtener versión actual de la base de datos
    let currentVersion = 0
    try {
      const versionResult = await db.query('SELECT value FROM _meta WHERE key = ?', ['db_version'])
      if (versionResult.values && versionResult.values.length > 0) {
        currentVersion = parseInt(versionResult.values[0].value) || 0
      }
    } catch (err) {
      console.log('[sqlite] ℹ️ No se encontró versión previa, iniciando desde 0')
    }
    
    console.log(`[sqlite] 📊 Versión actual de DB: ${currentVersion}, objetivo: ${CURRENT_SCHEMA_VERSION}`)
    
    // Migración v1: Crear tablas principales
    if (currentVersion < 1) {
      console.log('[sqlite] 🔄 Aplicando migración v1: Tablas principales...')
      
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
      
      // Tabla de favoritos locales
      await db.execute(`
        CREATE TABLE IF NOT EXISTS favorites_local (
          id TEXT PRIMARY KEY,
          bird_id TEXT UNIQUE NOT NULL,
          updated_at INTEGER NOT NULL,
          deleted_at INTEGER
        )
      `)
      
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
      
      console.log('[sqlite] ✅ Migración v1 completada')
    }
    
    // Migración v2: Agregar columnas de metadatos
    if (currentVersion < 2) {
      console.log('[sqlite] 🔄 Aplicando migración v2: Columnas de metadatos...')
      
      const columnsToAdd = [
        { table: 'sings', column: 'community', type: 'TEXT' },
        { table: 'sings', column: 'instruments', type: 'TEXT' },
        { table: 'sings', column: 'interpreters', type: 'TEXT' },
        { table: 'sings', column: 'author', type: 'TEXT' },
        { table: 'tracks', column: 'community', type: 'TEXT' },
        { table: 'tracks', column: 'instruments', type: 'TEXT' },
        { table: 'tracks', column: 'interpreters', type: 'TEXT' },
        { table: 'tracks', column: 'author', type: 'TEXT' }
      ]
      
      for (const { table, column, type } of columnsToAdd) {
        try {
          await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`)
          console.log(`[sqlite] ✅ Columna ${table}.${column} agregada`)
        } catch (err) {
          console.log(`[sqlite] ℹ️ Columna ${table}.${column} ya existía`)
        }
      }
      
      console.log('[sqlite] ✅ Migración v2 completada')
    }
    
    // Migración v3: Crear índices
    if (currentVersion < 3) {
      console.log('[sqlite] 🔄 Aplicando migración v3: Índices...')
      
      // Índices para activity_log
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp 
        ON activity_log(timestamp DESC)
      `)
      
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_activity_log_category 
        ON activity_log(category, timestamp DESC)
      `)
      
      // Índices para birds
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_birds_popularity 
        ON birds(popularity DESC, updated_at DESC)
      `)
      
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_birds_deleted 
        ON birds(deleted_at)
      `)
      
      console.log('[sqlite] ✅ Migración v3 completada')
    }
    
    // Actualizar versión en _meta
    await db.run(
      'INSERT INTO _meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      ['db_version', CURRENT_SCHEMA_VERSION.toString()]
    )
    
    console.log(`[sqlite] ✅ Migraciones completadas. Versión actualizada a ${CURRENT_SCHEMA_VERSION}`)
    
  } catch (err) {
    console.error('[sqlite] ❌ Error aplicando migraciones:', err)
    throw err
  }
}

/**
 * Detecta si un error indica corrupción o problemas de esquema
 */
function isSchemaError(error: any): boolean {
  if (!error || typeof error !== 'object') return false
  
  const errorMessage = error.message?.toLowerCase() || ''
  const errorCode = error.code || ''
  
  // Errores de esquema que requieren reinicio
  const schemaErrorPatterns = [
    'no such column',
    'duplicate column',
    'corrupt',
    'malformed',
    'database disk image is malformed',
    'database is locked',
    'table.*does not exist',
    'syntax error',
    'unrecognized token'
  ]
  
  return schemaErrorPatterns.some(pattern => 
    errorMessage.includes(pattern) || errorCode.includes(pattern)
  )
}

/**
 * Inicializa la base de datos SQLite con gestión inteligente de conexiones y migraciones
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

    // Aplicar migraciones solo si no se ha hecho antes
    if (!schemaInitialized) {
      await applyMigrations(db)
      schemaInitialized = true
    }
    
    dbInitialized = true
    if (!db) throw new Error('[sqlite] ❌ DB not initialized')
    return db
    
  } catch (err) {
    console.error('[sqlite] ❌ Error inicializando base de datos:', err)
    
    // Detectar errores de esquema y aplicar autorreparación
    if (isSchemaError(err)) {
      console.log('[sqlite] 🔧 Error de esquema detectado, iniciando autorreparación...')
      
      try {
        await resetDatabase()
        console.log('[sqlite] 🔄 Reintentando inicialización después de autorreparación...')
        
        // Reintento único después del reinicio
        return await initDb()
        
      } catch (retryErr) {
        console.error('[sqlite] ❌ Error en autorreparación:', retryErr)
        throw retryErr
      }
    }
    
    throw err
  }
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
  await newDb.run(`DELETE FROM _meta WHERE key != 'db_version'`)

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
    connectionName: DB_CONFIG.name,
    schemaVersion: CURRENT_SCHEMA_VERSION
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