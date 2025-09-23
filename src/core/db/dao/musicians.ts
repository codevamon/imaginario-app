import { getDb } from '../../sqlite';

export type Musician = {
  id: string;
  name: string;
  bio?: string;
  tags?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

export async function getMusiciansByBirdId(birdId: string): Promise<Musician[]> {
  try {
    const db = await getDb();
    const result = await db.query(`
      SELECT * FROM musicians 
      WHERE deleted_at IS NULL 
      ORDER BY updated_at DESC, name COLLATE NOCASE ASC
    `);
    
    // Convertir los resultados al tipo Musician
    const musicians: Musician[] = (result.values || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      bio: row.bio,
      tags: row.tags,
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
      deleted_at: row.deleted_at ? new Date(row.deleted_at).toISOString() : null
    }));
    
    return musicians;
    
  } catch (error) {
    console.error('[DAO] getMusiciansByBirdId error:', error);
    return [];
  }
}
