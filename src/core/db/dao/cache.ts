import { getDb } from '../../sqlite';

/**
 * Actualiza la columna cached_path de cualquier tabla que contenga audios.
 * Se usa desde prepareSource() para tracks, sings e interviews.
 */
export async function updateCachedPathUniversal(table: string, id: string, path: string) {
  try {
    const db = await getDb();
    await db.run(`UPDATE ${table} SET cached_path = ? WHERE id = ?`, [path, id]);
    console.log(`[Cache] cached_path actualizado en ${table}:`, id);
  } catch (err) {
    console.warn(`[Cache] Error actualizando cached_path en ${table}:`, err);
  }
}


