import { getDb } from '../../sqlite';

export type Track = {
  id: string;
  bird_id: string;
  title: string;
  audio_url: string;
  duration_ms?: number;
  updated_at?: string;
  deleted_at?: string | null;
};

export async function getTracksByBirdId(birdId: string): Promise<Track[]> {
  try {
    const db = await getDb();
    const result = await db.query(`
      SELECT * FROM tracks 
      WHERE bird_id = ? AND deleted_at IS NULL 
      ORDER BY updated_at DESC, title COLLATE NOCASE ASC
    `, [birdId]);
    
    // Convertir los resultados al tipo Track
    const tracks: Track[] = (result.values || []).map((row: any) => ({
      id: row.id,
      bird_id: row.bird_id,
      title: row.title,
      audio_url: row.audio_url,
      duration_ms: row.duration_ms,
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
      deleted_at: row.deleted_at ? new Date(row.deleted_at).toISOString() : null
    }));
    
    return tracks;
    
  } catch (error) {
    console.error('[DAO] getTracksByBirdId error:', error);
    return [];
  }
}
