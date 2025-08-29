// src/core/sync/pull.ts
import { supabase } from '../supabase';
import { upsertMany } from '../db/dao.catalog';
import { getMetaValue, setMetaValue } from '../sqlite';

type Bird = { id:string; name:string; description?:string; rarity?:number; popularity?:number; tags?:string; image_url?:string; updated_at:number; deleted_at?:number|null };

export async function pullBirdsDelta(pageSize = 500) {
  if (!supabase) { console.warn('[sync] supabase no configurado; omito pull'); return 0; }
  let since = parseInt((await getMetaValue('birds_last_sync')) || '0', 10) || 0;
  let total = 0;

  while (true) {
    const { data, error } = await supabase
      .from('birds')
      .select('*')
      .gt('updated_at', since)
      .order('updated_at', { ascending: true })
      .limit(pageSize);

    if (error) throw error;

    const rows = (data || []) as Bird[];
    if (!rows.length) break;

    await upsertMany('birds', rows.map(b => ({ ...b, deleted_at: b.deleted_at ?? null })));
    since = rows[rows.length - 1].updated_at;
    total += rows.length;

    // guarda cursor
    await setMetaValue('birds_last_sync', String(since));
    if (rows.length < pageSize) break;
  }
  return total;
}
