// src/core/db/dao/activity_log.ts
import { getDb } from '../../sqlite';

export type ActivityLogEntry = {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  category: 'sync' | 'error' | 'user_action';
  message: string;
  details?: string;
  table?: string;
  record_count?: number;
};

/**
 * Inicializa la tabla de activity_log si no existe
 * NOTA: Esta función ya no es necesaria ya que la tabla se crea en initDb()
 * Se mantiene por compatibilidad pero no se debe llamar
 */
export async function initActivityLog() {
  console.warn('[activity_log] ⚠️ initActivityLog() está deprecado. La tabla se crea automáticamente en initDb()');
  // No hacer nada, la tabla ya se crea en initDb()
}

/**
 * Registra una entrada en el activity log
 */
export async function logActivity(entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) {
  const db = await getDb();
  const id = `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const timestamp = Date.now();
  
  await db.run(`
    INSERT INTO activity_log (id, timestamp, level, category, message, details, table_name, record_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    timestamp,
    entry.level,
    entry.category,
    entry.message,
    entry.details || null,
    entry.table || null,
    entry.record_count || null
  ]);
  
  // Mantener solo los últimos 1000 registros para evitar que la tabla crezca demasiado
  await db.run(`
    DELETE FROM activity_log 
    WHERE id NOT IN (
      SELECT id FROM activity_log 
      ORDER BY timestamp DESC 
      LIMIT 1000
    )
  `);
}

/**
 * Obtiene las últimas entradas del activity log
 */
export async function getRecentActivity(limit = 50): Promise<ActivityLogEntry[]> {
  const db = await getDb();
  const result = await db.query(`
    SELECT * FROM activity_log 
    ORDER BY timestamp DESC 
    LIMIT ?
  `, [limit]);
  
  return result.values || [];
}

/**
 * Obtiene entradas por categoría
 */
export async function getActivityByCategory(category: ActivityLogEntry['category'], limit = 50): Promise<ActivityLogEntry[]> {
  const db = await getDb();
  const result = await db.query(`
    SELECT * FROM activity_log 
    WHERE category = ?
    ORDER BY timestamp DESC 
    LIMIT ?
  `, [category, limit]);
  
  return result.values || [];
}

/**
 * Limpia entradas antiguas (más de 30 días)
 */
export async function cleanupOldActivity() {
  const db = await getDb();
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  
  await db.run(`
    DELETE FROM activity_log 
    WHERE timestamp < ?
  `, [thirtyDaysAgo]);
  
  console.log('[activity_log] 🧹 Limpieza de logs antiguos completada');
}
