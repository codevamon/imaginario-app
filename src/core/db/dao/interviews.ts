import { getDb } from '../../sqlite';

export type Interview = {
  id: string;
  bird_id: string;
  title: string;
  audio_url: string;
  updated_at?: string;
  deleted_at?: string | null;
};

export async function getInterviewsByBirdId(birdId: string): Promise<Interview[]> {
  try {
    const db = await getDb();
    const result = await db.query(
      'SELECT * FROM interviews WHERE bird_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC',
      [birdId]
    );
    return (result.values || []).map((row: any) => ({
      id: row.id,
      bird_id: row.bird_id,
      title: row.title,
      audio_url: row.audio_url,
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
      deleted_at: row.deleted_at ? new Date(row.deleted_at).toISOString() : null,
    }));
  } catch (error) {
    console.error('[DAO] getInterviewsByBirdId error:', error);
    return [];
  }
}

export async function getInterviewById(id: string): Promise<Interview | null> {
  try {
    const db = await getDb();
    const result = await db.query(
      'SELECT * FROM interviews WHERE id = ? AND deleted_at IS NULL LIMIT 1',
      [id]
    );
    if (result.values && result.values.length > 0) {
      const row = result.values[0];
      return {
        id: row.id,
        bird_id: row.bird_id,
        title: row.title,
        audio_url: row.audio_url,
        updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
        deleted_at: row.deleted_at ? new Date(row.deleted_at).toISOString() : null,
      };
    }
    return null;
  } catch (error) {
    console.error('[DAO] getInterviewById error:', error);
    return null;
  }
}
