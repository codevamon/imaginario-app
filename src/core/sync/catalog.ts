// src/core/sync/catalog.ts
import { supabase } from '../supabase';
import { upsertMany } from '../db/dao/catalog';
import { getMetaValue, setMetaValue } from "../sqlite";

export async function pullBirds(pageSize = 200) {
  // 👇 evita crash si no hay envs
  if (!supabase) {
    console.warn('[sync] Supabase no configurado; omito pull');
    return 0;
  }

  let since = Number((await getMetaValue('birds_last_sync')) ?? 0);
  let total = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('birds')
      .select('id,name,description,rarity,popularity,tags,image_url,updated_at,deleted_at')
      .gt('updated_at', since)       // BIGINT en ms
      .order('updated_at', { ascending: true })
      .limit(pageSize);

    if (error) throw error;
    if (!data || data.length === 0) break;

    const rows = data.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description ?? null,
      rarity: r.rarity ?? 0,
      popularity: r.popularity ?? 0,
      tags: r.tags ?? null,
      image_url: r.image_url ?? null,
      updated_at: Number(r.updated_at),
      deleted_at: r.deleted_at == null ? null : Number(r.deleted_at),
    }));

    await upsertMany('birds', rows);
    total += rows.length;

    since = rows[rows.length - 1].updated_at;
    await setMetaValue('birds_last_sync', String(since));

    if (rows.length < pageSize) break;
  }
  return total;
}
