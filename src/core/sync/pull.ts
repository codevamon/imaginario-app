// src/core/sync/pull.ts
import { supabase } from '../supabase';
import { upsertMany } from '../db/dao';
import { getMetaValue, setMetaValue, getDb } from '../sqlite';
import { logActivity, initActivityLog } from '../db/dao/activity_log';
import type { Bird } from '../db/dao/birds';
import { Network } from '@capacitor/network';

type SyncResult = {
  table: string;
  total: number;
  success: boolean;
  error?: string;
};

type PullResult = {
  success: boolean;
  totalRecords: number;
  results: SyncResult[];
  errors: string[];
};

// Configuración de sincronización
const SYNC_CONFIG = {
  pageSize: 200, // Reducido para evitar problemas de payload
  maxRetries: 3,
  retryDelay: 1000, // Base delay para backoff exponencial
  tables: ['birds', 'bird_images', 'bird_translations', 'sings', 'tracks', 'interviews', 'musicians'] as const
};

const DEBUG_AUDIO_PERSISTENCE = true;

function audioPersistenceDebug(label: string, data: Record<string, unknown>) {
  if (!DEBUG_AUDIO_PERSISTENCE) return;
  console.log(`[AudioPersistenceDebug] ${label}`, data);
}

// activity_log se inicializa automáticamente en initDb()

/**
 * Función principal de pull que sincroniza todas las tablas
 */
export async function pullAllTables(): Promise<PullResult> {
  try {
    const status = await Network.getStatus();
    if (!status.connected) {
      console.warn('[pullAllTables] 🚫 Sin conexión: se omite sincronización.');
      return {
        success: false,
        totalRecords: 0,
        results: [],
        errors: ['Sin conexión a Internet']
      };
    }
    console.log('[pullAllTables] 🌐 Conexión activa, iniciando sync...');
  } catch (err) {
    console.error('[pullAllTables] ❌ Error verificando conexión:', err);
    return {
      success: false,
      totalRecords: 0,
      results: [],
      errors: [`Error verificando conexión: ${err}`]
    };
  }

  console.log('[sync] 🚀 Iniciando sincronización completa...');
  
  // Log de inicio de sincronización
  await logActivity({
    level: 'info',
    category: 'sync',
    message: 'Iniciando sincronización completa',
    details: `Tablas: ${SYNC_CONFIG.tables.join(', ')}`
  });
  
  const result: PullResult = {
    success: true,
    totalRecords: 0,
    results: [],
    errors: []
  };

  if (!supabase) {
    const error = 'Supabase no configurado';
    console.warn(`[sync] ❌ ${error}`);
    
    await logActivity({
      level: 'error',
      category: 'error',
      message: 'Error de configuración',
      details: error
    });
    
    result.success = false;
    result.errors.push(error);
    return result;
  }

  // Sincronizar cada tabla secuencialmente
  for (const table of SYNC_CONFIG.tables) {
    try {
      console.log(`[sync] 📥 Sincronizando tabla: ${table}`);
      const tableResult = await pullTableWithRetry(table);
      result.results.push(tableResult);
      result.totalRecords += tableResult.total;
      
      if (!tableResult.success) {
        result.success = false;
        result.errors.push(`Error en tabla ${table}: ${tableResult.error}`);
      }
    } catch (error) {
      const errorMsg = `Error crítico en tabla ${table}: ${error}`;
      console.error(`[sync] ❌ ${errorMsg}`);
      
      await logActivity({
        level: 'error',
        category: 'error',
        message: `Error crítico en tabla ${table}`,
        details: errorMsg,
        table
      });
      
      result.success = false;
      result.errors.push(errorMsg);
      result.results.push({
        table,
        total: 0,
        success: false,
        error: errorMsg
      });
    }
  }

  // Log de finalización
  await logActivity({
    level: result.success ? 'info' : 'error',
    category: 'sync',
    message: result.success ? 'Sincronización completada exitosamente' : 'Sincronización completada con errores',
    details: `Total: ${result.totalRecords} registros, Errores: ${result.errors.length}`,
    record_count: result.totalRecords
  });

  console.log(`[sync] ✅ Sincronización completada. Total: ${result.totalRecords} registros`);
  return result;
}

/**
 * Sincroniza una tabla específica con retry logic
 */
async function pullTableWithRetry(table: string, retries = SYNC_CONFIG.maxRetries): Promise<SyncResult> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const total = await pullTableDelta(table, SYNC_CONFIG.pageSize);
      
      // Log de éxito
      await logActivity({
        level: 'info',
        category: 'sync',
        message: `Sincronización exitosa de tabla ${table}`,
        details: `${total} registros sincronizados`,
        table,
        record_count: total
      });
      
      return {
        table,
        total,
        success: true
      };
    } catch (error) {
      const errorMsg = `Intento ${attempt}/${retries} falló: ${error}`;
      console.warn(`[sync] ⚠️ ${errorMsg}`);
      
      // Log de error de intento
      await logActivity({
        level: attempt === retries ? 'error' : 'warn',
        category: 'error',
        message: `Error en tabla ${table} (intento ${attempt}/${retries})`,
        details: errorMsg,
        table
      });
      
      if (attempt === retries) {
        return {
          table,
          total: 0,
          success: false,
          error: errorMsg
        };
      }
      
      // Backoff exponencial: 1s, 2s, 4s
      const delay = SYNC_CONFIG.retryDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return {
    table,
    total: 0,
    success: false,
    error: 'Máximo de reintentos alcanzado'
  };
}

/**
 * Sincroniza una tabla específica (implementación mejorada)
 */
export async function pullTableDelta(table: string, pageSize = SYNC_CONFIG.pageSize): Promise<number> {
  if (!supabase) { 
    console.warn('[sync] supabase no configurado; omito pull'); 
    return 0; 
  }

  const metaKey = `${table}_last_sync`;
  let since = parseInt((await getMetaValue(metaKey)) || '0', 10) || 0;
  let total = 0;

  console.log(`[sync] 📊 ${table}: sincronizando desde ${new Date(since).toISOString()}`);

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .gt('updated_at', since)
      .order('updated_at', { ascending: true })
      .limit(pageSize);

    if (error) {
      console.error(`[sync] ❌ Error en Supabase para tabla ${table}:`, error);
      throw error;
    }
    console.log('[sync] 🔎 Data cruda desde Supabase:', JSON.stringify(data, null, 2));
    
    // Logs específicos para tracks e interviews
    if (table === 'tracks') {
      console.log("[sync] 📊 Raw tracks from Supabase:", data?.slice(0, 3));
    }
    if (table === 'interviews') {
      console.log("[sync] 📊 Raw interviews from Supabase:", data?.slice(0, 3));
    }
    
    const rows = (data || []) as any[];
    if (!rows.length) break;

    // Helper seguro para normalizar fechas (epoch ms o string → number | null)
    const normalizeDate = (value: any): number | null => {
      if (!value) return null;
      if (typeof value === 'number') return value > 0 ? value : null;
      const parsed = Date.parse(value);
      return isNaN(parsed) ? null : parsed;
    };

    // Normalizar datos antes de insertar (específico por tabla)
    const normalizedRows = rows.map(row => {
      const baseRow = {
        ...row,
        updated_at: row.updated_at ? Number(row.updated_at) : null,
        deleted_at: row.deleted_at ? Number(row.deleted_at) : null
      };
      
      // Campos específicos por tabla
      if (table === 'birds') {
        return {
          ...baseRow,
          rarity: row.rarity ?? null,
          popularity: row.popularity ?? null
        };
      }
      
      // sings, tracks, interviews, musicians → mismos campos
      return {
        ...baseRow,
        title: row.title ?? null,
        audio_url: row.audio_url ?? null,
        duration_ms: row.duration_ms ?? null,
        community: row.community ?? null,
        instruments: row.instruments ?? null,
        interpreters: row.interpreters ?? null,
        author: row.author ?? null
      };
    });

    if (
      DEBUG_AUDIO_PERSISTENCE &&
      (table === 'sings' || table === 'tracks' || table === 'interviews')
    ) {
      try {
        const ids = normalizedRows.map((row) => row.id).filter(Boolean);
        if (ids.length > 0) {
          const dbConnection = await getDb();
          const placeholders = ids.map(() => '?').join(',');
          const existing = await dbConnection.query(
            `SELECT id, audio_url FROM ${table} WHERE id IN (${placeholders})`,
            ids
          );
          const previousById = new Map(
            (existing.values || []).map((row: any) => [row.id, row.audio_url ?? null])
          );
          for (const row of normalizedRows) {
            if (!previousById.has(row.id)) continue;
            const previousUrl = previousById.get(row.id);
            const newUrl = row.audio_url ?? null;
            if (previousUrl !== newUrl) {
              audioPersistenceDebug('audio url changed', {
                table,
                id: row.id,
                previousUrl,
                newUrl,
              });
            }
          }
        }
      } catch (debugError) {
        console.warn('[AudioPersistenceDebug] url-compare failed', debugError);
      }
    }

    await upsertMany(table, normalizedRows);
    
    // Logs específicos después del upsert
    if (table === 'tracks') {
      console.log("[sync] ✅ Upserted tracks count:", rows.length);
    }
    if (table === 'interviews') {
      console.log("[sync] ✅ Upserted interviews count:", rows.length);
    }
    
    since = rows[rows.length - 1].updated_at ? Number(rows[rows.length - 1].updated_at) : 0;
    total += rows.length;

    // Verificación post-upsert para sings, tracks e interviews
    if (['sings', 'tracks', 'interviews'].includes(table)) {
      const dbConnection = await getDb();
      const total = await dbConnection.query(`SELECT COUNT(*) as c FROM ${table}`);
      const byBird = await dbConnection.query(`
        SELECT bird_id, COUNT(*) as c 
        FROM ${table} 
        WHERE deleted_at IS NULL 
        GROUP BY bird_id 
        LIMIT 5
      `);

      console.log(`[sync][verify] ${table} total en SQLite:`, total.values?.[0]?.c);
      console.log(`[sync][verify] ${table} distribución por bird_id:`, byBird.values);
      
      // Conteo directo específico para tracks e interviews
      if (table === 'tracks') {
        const { values: count } = await dbConnection.query(`SELECT COUNT(*) as c FROM tracks`);
        console.log("[sync] 🔍 Total tracks in SQLite:", count?.[0]?.c);
      }
      if (table === 'interviews') {
        const { values: count } = await dbConnection.query(`SELECT COUNT(*) as c FROM interviews`);
        console.log("[sync] 🔍 Total interviews in SQLite:", count?.[0]?.c);
      }
    }

    // Debug específico para tracks e interviews - mostrar filas reales
    if (table === 'tracks' || table === 'interviews') {
      const dbConnection = await getDb();
      const sampleRows = await dbConnection.query(
        `SELECT id, bird_id, title, audio_url, updated_at, deleted_at 
         FROM ${table} 
         WHERE bird_id = 'crotophaga-ani' 
         LIMIT 5`
      );
      console.log(`[sync][DEBUG] ${table}: registros en SQLite para bird_id=crotophaga-ani:`, sampleRows.values);
    }

    // Guardar cursor de sincronización
    await setMetaValue(metaKey, String(since));
    
    console.log(`[sync] 📥 ${table}: +${rows.length} registros (total: ${total})`);
    
    // Log específico para tracks e interviews
    if (table === 'tracks') {
      console.log(`[sync] 🎵 Upsert tracks: ${rows.length} registros procesados`);
      console.log('[sync] 🎵 Sample track data:', rows.slice(0, 2).map(r => ({ id: r.id, bird_id: r.bird_id, title: r.title })));
    }
    if (table === 'interviews') {
      console.log(`[sync] 🎤 Upsert interviews: ${rows.length} registros procesados`);
      console.log('[sync] 🎤 Sample interview data:', rows.slice(0, 2).map(r => ({ id: r.id, bird_id: r.bird_id, title: r.title })));
    }
    
    if (rows.length < pageSize) break;
  }

  // 🔥 Limpieza de registros eliminados
  try {
    if (['birds', 'tracks', 'interviews', 'sings', 'musicians'].includes(table)) {
      const db = await getDb();
      await db.run(`DELETE FROM ${table} WHERE deleted_at IS NOT NULL`);
      console.log(`[sync][cleanup] Registros eliminados limpiados en ${table}`);
    }
  } catch (cleanupError) {
    console.error(`[sync][cleanup] Error limpiando ${table}:`, cleanupError);
  }

  console.log(`[sync] ✅ ${table}: sincronización completada (${total} registros)`);
  return total;
}

/**
 * Función de conveniencia para sincronizar solo birds (compatibilidad)
 */
export async function pullBirdsDelta(pageSize = SYNC_CONFIG.pageSize): Promise<number> {
  return pullTableDelta('birds', pageSize);
}














/**
 * Resync completo de una tabla:
 * - Borra todos los registros locales
 * - Trae todo desde Supabase sin delta
 */
export async function resyncTable(table: string, pageSize = SYNC_CONFIG.pageSize): Promise<number> {
  if (!supabase) {
    console.warn('[resync] supabase no configurado; omito');
    return 0;
  }

  const db = await getDb();
  await db.run(`DELETE FROM ${table}`); // limpiar tabla local
  await setMetaValue(`${table}_last_sync`, '0'); // resetear cursor

  let total = 0;
  let lastId = null;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('updated_at', { ascending: true })
      .limit(pageSize);

    if (error) throw error;
    if (!data || data.length === 0) break;

    await upsertMany(table, data);
    total += data.length;

    if (data.length < pageSize) break;
  }

  console.log(`[resync] ✅ ${table}: repoblada con ${total} registros`);
  return total;
}

/**
 * Resync de todas las tablas del catálogo
 */
export async function resyncAllTables(): Promise<void> {
  for (const table of SYNC_CONFIG.tables) {
    try {
      await resyncTable(table);
    } catch (err) {
      console.error(`[resync] ❌ Error resync en ${table}`, err);
    }
  }
}