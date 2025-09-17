import { getDb } from '../../sqlite';

export type Track = {
  id: string;
  bird_id: string;
  title: string;
  url: string;
  type: 'song' | 'music';
};

export async function getTracksByBirdId(birdId: string): Promise<Track[]> {
  try {
    const db = await getDb();
    const result = await db.query(
      'SELECT * FROM tracks WHERE bird_id = ? AND deleted_at IS NULL ORDER BY created_at DESC',
      [birdId]
    );
    return (result.values || []).map((row: any) => ({
      id: row.id,
      bird_id: row.bird_id,
      title: row.title,
      url: row.url,
      type: row.type || 'song',
    }));
  } catch (error) {
    console.error('[DAO] getTracksByBirdId error:', error);
    return [];
  }
}
