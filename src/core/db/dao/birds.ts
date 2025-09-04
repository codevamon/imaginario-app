import { getDb } from '../../sqlite';

export type Rarity = 'baja'|'media'|'alta'|'muy alta' | number;

export type Bird = {
  id: string;
  name: string;
  description?: string|null;
  scientific_name?: string|null;   // NUEVO
  rarity?: Rarity|null;
  popularity?: number|null;
  tags?: string|null;
  image_url?: string|null;
  audio_url?: string|null;         // NUEVO
  updated_at?: number|null;        // BIGINT ms
  deleted_at?: number|null;        // NUEVO (tombstone)
};

export async function listBirds(): Promise<Bird[]> {
  const db = await getDb();
  const res = await db.query(
    `SELECT * FROM birds
     WHERE IFNULL(deleted_at,0)=0
     ORDER BY COALESCE(popularity,0) DESC, name ASC`
  );
  return res.values ?? [];
}

/** Carrusel: recientes + populares */
export async function getFeaturedBirds(limit = 8): Promise<Bird[]> {
  const db = await getDb();
  const res = await db.query(
    `SELECT * FROM birds
     WHERE IFNULL(deleted_at,0)=0
     ORDER BY updated_at DESC, COALESCE(popularity,0) DESC
     LIMIT ?`, [limit]
  );
  return res.values ?? [];
}

/** Lista Top 5 por popularidad */
export async function getTopPopular(limit = 5): Promise<Bird[]> {
  const db = await getDb();
  const res = await db.query(
    `SELECT * FROM birds
     WHERE IFNULL(deleted_at,0)=0
     ORDER BY COALESCE(popularity,0) DESC, name ASC
     LIMIT ?`, [limit]
  );
  return res.values ?? [];
}

export async function upsertBird(b: Bird) {
  const db = await getDb();
  const sql = `
    INSERT INTO birds (
      id,name,description,scientific_name,rarity,popularity,tags,image_url,audio_url,updated_at,deleted_at
    ) VALUES (?,?,?,?,?,?,?,?,?, COALESCE(?, CAST(strftime('%s','now') AS INTEGER)*1000), ?)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name,
      description=excluded.description,
      scientific_name=excluded.scientific_name,
      rarity=excluded.rarity,
      popularity=excluded.popularity,
      tags=excluded.tags,
      image_url=excluded.image_url,
      audio_url=excluded.audio_url,
      updated_at=excluded.updated_at,
      deleted_at=excluded.deleted_at
  `;
  await db.run(sql, [
    b.id,
    b.name,
    b.description ?? null,
    b.scientific_name ?? null,
    b.rarity ?? null,
    b.popularity ?? null,
    b.tags ?? null,
    b.image_url ?? null,
    b.audio_url ?? null,
    b.updated_at ?? null,
    b.deleted_at ?? null,
  ]);
}

export async function seedDemo() {
  const demo: Bird[] = [
    {
      id: 'b1',
      name: 'Buphanornis',
      scientific_name: 'Buphanornis imaginarius',
      rarity: 1, // 0=baja,1=media,2=alta,3=muy alta
      popularity: 87,
      image_url: 'https://picsum.photos/seed/bird1/800/600',
      audio_url: 'https://cdn.freesound.org/previews/682/682647_5674468-lq.mp3',
    },
  ];
  for (const b of demo) await upsertBird(b);
  const c = await (await getDb()).query('SELECT COUNT(*) AS c FROM birds');
  return c.values?.[0]?.c ?? 0;
}
