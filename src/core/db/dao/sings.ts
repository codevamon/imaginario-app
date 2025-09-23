import { getDb } from '../../sqlite'

export type Sing = {
  id: string;
  bird_id: string;
  title?: string;
  audio_url: string;
  duration_ms?: number;
  updated_at?: string;
  deleted_at?: string | null;
};

export async function getSingsByBirdId(birdId: string): Promise<Sing[]> {
  try {
    const db = await getDb();
    const result = await db.query(`
      SELECT * FROM sings 
      WHERE bird_id = ? AND deleted_at IS NULL 
      ORDER BY title COLLATE NOCASE ASC, updated_at DESC
    `, [birdId]);
    
    // Convertir los resultados al tipo Sing
    const sings: Sing[] = (result.values || []).map((row: any) => ({
      id: row.id,
      bird_id: row.bird_id,
      title: row.title,
      audio_url: row.audio_url,
      duration_ms: row.duration_ms,
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
      deleted_at: row.deleted_at ? new Date(row.deleted_at).toISOString() : null
    }));
    
    return sings;
    
  } catch (error) {
    console.error('[DAO] getSingsByBirdId error:', error);
    return [];
  }
}

export async function getSingById(id: string): Promise<Sing | null> {
  try {
    const db = await getDb();
    const result = await db.query(`
      SELECT * FROM sings 
      WHERE id = ? AND deleted_at IS NULL 
      LIMIT 1
    `, [id]);
    
    if (result.values && result.values.length > 0) {
      const row = result.values[0];
      return {
        id: row.id,
        bird_id: row.bird_id,
        title: row.title,
        audio_url: row.audio_url,
        duration_ms: row.duration_ms,
        updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
        deleted_at: row.deleted_at ? new Date(row.deleted_at).toISOString() : null
      };
    }
    return null;
  } catch (error) {
    console.error('[DAO] getSingById error:', error);
    return null;
  }
}
