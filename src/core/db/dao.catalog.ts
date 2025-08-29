// src/core/db/dao.catalog.ts
import { getDb } from '../sqlite';

type Row = Record<string, any>;

export async function upsert(table: string, row: Row, conflictKey = 'id') {
  const db = await getDb();
  const cols = Object.keys(row);
  const placeholders = cols.map(() => '?').join(',');
  const update = cols.filter(c => c !== conflictKey).map(c => `${c}=excluded.${c}`).join(',');
  const sql = `INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})
               ON CONFLICT(${conflictKey}) DO UPDATE SET ${update};`;
  await db.run(sql, cols.map(c => row[c]));
}

export async function upsertMany(table: string, rows: Row[]) {
  const db = await getDb();
  await db.execute('BEGIN');
  try {
    for (const r of rows) {
      const cols = Object.keys(r);
      const placeholders = cols.map(() => '?').join(',');
      const update = cols.filter(c => c !== 'id').map(c => `${c}=excluded.${c}`).join(',');
      const sql = `INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})
                   ON CONFLICT(id) DO UPDATE SET ${update};`;
      await db.run(sql, cols.map(c => r[c]));
    }
    await db.execute('COMMIT');
  } catch (e) { await db.execute('ROLLBACK'); throw e; }
}

export async function listBirds(limit = 200) {
  const db = await getDb();
  const r = await db.query(
    `SELECT * FROM birds WHERE (deleted_at IS NULL) ORDER BY popularity DESC, updated_at DESC LIMIT ?`,
    [limit]
  );
  return r.values ?? [];
}

export async function setLocalFavorite(bird_id: string, on: boolean) {
  const db = await getDb();
  const now = Date.now();
  if (on) {
    await db.run(`INSERT INTO favorites_local(id,bird_id,updated_at,deleted_at)
                  VALUES(?, ?, ?, NULL)
                  ON CONFLICT(bird_id) DO UPDATE SET deleted_at=NULL, updated_at=excluded.updated_at`,
      [`fav-${bird_id}`, bird_id, now]);
  } else {
    await db.run(`UPDATE favorites_local SET deleted_at=?, updated_at=? WHERE bird_id=?`, [now, now, bird_id]);
  }
}

export async function isFavLocal(bird_id: string): Promise<boolean> {
  const db = await getDb();
  const r = await db.query(`SELECT 1 FROM favorites_local WHERE bird_id=? AND deleted_at IS NULL LIMIT 1`, [bird_id]);
  return !!r.values?.length;
}
