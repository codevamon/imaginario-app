// src/core/sync/pull.ts
import { supabase } from '../supabase';
import { upsertMany } from '../db/dao';
import { getMetaValue, setMetaValue } from '../sqlite';
import { logActivity, initActivityLog } from '../db/dao/activity_log';
import type { Bird } from '../db/dao/birds';

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
  tables: ['birds'] as const
};

// activity_log se inicializa automáticamente en initDb()

/**
 * Función principal de pull que sincroniza todas las tablas
 */
export async function pullAllTables(): Promise<PullResult> {
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
    const rows = (data || []) as Bird[];
    if (!rows.length) break;

    // Normalizar datos antes de insertar
    const normalizedRows = rows.map(row => ({
      ...row,
      deleted_at: row.deleted_at ?? null,
      updated_at: Number(row.updated_at),
      rarity: row.rarity ?? null,
      popularity: row.popularity ?? null
    }));

    await upsertMany(table, normalizedRows);
    since = rows[rows.length - 1].updated_at || 0;
    total += rows.length;

    // Guardar cursor de sincronización
    await setMetaValue(metaKey, String(since));
    
    console.log(`[sync] 📥 ${table}: +${rows.length} registros (total: ${total})`);
    
    if (rows.length < pageSize) break;
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
