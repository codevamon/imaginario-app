import { getDb } from '../../sqlite';

export type Musician = {
  id: string;
  bird_id: string;
  name: string;
  url: string;
};

export async function getMusiciansByBirdId(birdId: string): Promise<Musician[]> {
  try {
    const db = await getDb();
    const result = await db.query(
      'SELECT * FROM musicians WHERE bird_id = ? AND deleted_at IS NULL ORDER BY created_at DESC',
      [birdId]
    );
    return (result.values || []).map((row: any) => ({
      id: row.id,
      bird_id: row.bird_id,
      name: row.name,
      url: row.url,
    }));
  } catch (error) {
    console.error('[DAO] getMusiciansByBirdId error:', error);
    return [];
  }
}
