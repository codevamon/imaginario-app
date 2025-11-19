import { getDb } from '../../sqlite'

export type BirdImage = {
  id: string;
  bird_id: string;
  url: string;
  description?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

export async function getImagesByBirdId(birdId: string): Promise<BirdImage[]> {
  try {
    const db = await getDb();
    const result = await db.query(`
      SELECT * FROM bird_images 
      WHERE bird_id = ? AND deleted_at IS NULL 
      ORDER BY updated_at DESC, id ASC
    `, [birdId]);
    
    // Convertir los resultados al tipo BirdImage
    const images: BirdImage[] = (result.values || []).map((row: any) => ({
      id: row.id,
      bird_id: row.bird_id,
      url: row.url,
      description: row.description,
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
      deleted_at: row.deleted_at ? new Date(row.deleted_at).toISOString() : null
    }));
    
    return images;
    
  } catch (error) {
    console.error('[DAO] getImagesByBirdId error:', error);
    return [];
  }
}

export async function getImageById(id: string): Promise<BirdImage | null> {
  try {
    const db = await getDb();
    const result = await db.query(`
      SELECT * FROM bird_images 
      WHERE id = ? AND deleted_at IS NULL 
      LIMIT 1
    `, [id]);
    
    if (result.values && result.values.length > 0) {
      const row = result.values[0];
      return {
        id: row.id,
        bird_id: row.bird_id,
        url: row.url,
        description: row.description,
        updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
        deleted_at: row.deleted_at ? new Date(row.deleted_at).toISOString() : null
      };
    }
    return null;
  } catch (error) {
    console.error('[DAO] getImageById error:', error);
    return null;
  }
}