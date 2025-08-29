import { getDb, uid, saveWebStore } from './sqlite';

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

export async function softDelete(table: string, id: string, ts: number = Date.now()) {
  const db = await getDb();
  await db.run(`UPDATE ${table} SET deleted_at = ?, updated_at = ? WHERE id = ?`, [ts, ts, id]);
}

export async function findByUpdatedAt(table: string, since: number, limit = 200) {
  const db = await getDb();
  const r = await db.query(
    `SELECT * FROM ${table} WHERE updated_at > ? ORDER BY updated_at ASC LIMIT ?`,
    [since, limit]
  );
  return r.values ?? [];
}

export async function listImaginarios(limit = 100) {
  const db = await getDb();
  const r = await db.query(
    `SELECT * FROM imaginarios WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT ?`,
    [limit]
  );
  return r.values ?? [];
}

export async function createImagDemo() {
  const now = Date.now();
  const row = {
    id: uid(),
    owner_id: 'local-user',
    title: 'Imaginario de prueba',
    body: 'Creado offline en SQLite',
    tags: 'demo,offline',
    image_url: null,
    created_at: now,
    updated_at: now,
    deleted_at: null
  };
  await upsert('imaginarios', row);
  await saveWebStore();  // 👈 asegura persistencia en web
  return row.id;
}