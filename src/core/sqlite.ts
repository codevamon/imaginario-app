import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite'

let sqlite: SQLiteConnection | null = null
let db: SQLiteDBConnection | null = null
let dbInitialized = false

export async function initDb() {
  console.log('[sqlite] 🚀 Inicializando base de datos (nativo)')

  try {
    if (!sqlite) {
      sqlite = new SQLiteConnection(CapacitorSQLite)
      console.log('[sqlite] ✅ SQLiteConnection creada')
    }

    const dbConnection = await sqlite.createConnection(
      'imaginario.db',
      false,
      'no-encryption',
      1,
      false
    )
    await dbConnection.open()
    console.log('[sqlite] ✅ Conexión abierta a imaginario.db')

    await dbConnection.execute(`
      CREATE TABLE IF NOT EXISTS _meta (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `)
    console.log('[sqlite] ✅ Tabla _meta creada/verificada')

    db = dbConnection
    dbInitialized = true
    return dbConnection
  } catch (err) {
    console.error('[sqlite] ❌ Error inicializando base de datos:', err)
    throw err
  }
}

export async function getDb(): Promise<SQLiteDBConnection> {
  if (dbInitialized && db) return db
  return await initDb()
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