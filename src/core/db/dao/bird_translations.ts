import { getDb } from '../../sqlite'

export type BirdTranslation = {
  id: string;
  bird_id: string;
  lang: string;
  description?: string;
  audio_url?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

export async function getTranslationsByBirdId(birdId: string): Promise<BirdTranslation[]> {
  try {
    const db = await getDb();
    const result = await db.query(`
      SELECT * FROM bird_translations 
      WHERE bird_id = ? AND deleted_at IS NULL 
      ORDER BY lang ASC
    `, [birdId]);
    
    // Convertir los resultados al tipo BirdTranslation
    const translations: BirdTranslation[] = (result.values || []).map((row: any) => ({
      id: row.id,
      bird_id: row.bird_id,
      lang: row.lang,
      description: row.description,
      audio_url: row.audio_url,
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
      deleted_at: row.deleted_at ? new Date(row.deleted_at).toISOString() : null
    }));
    
    return translations;
    
  } catch (error) {
    console.error('[DAO] getTranslationsByBirdId error:', error);
    return [];
  }
}

export async function getTranslationById(id: string): Promise<BirdTranslation | null> {
  try {
    const db = await getDb();
    const result = await db.query(`
      SELECT * FROM bird_translations 
      WHERE id = ? AND deleted_at IS NULL 
      LIMIT 1
    `, [id]);
    
    if (result.values && result.values.length > 0) {
      const row = result.values[0];
      return {
        id: row.id,
        bird_id: row.bird_id,
        lang: row.lang,
        description: row.description,
        audio_url: row.audio_url,
        updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
        deleted_at: row.deleted_at ? new Date(row.deleted_at).toISOString() : null
      };
    }
    return null;
  } catch (error) {
    console.error('[DAO] getTranslationById error:', error);
    return null;
  }
}

export async function getTranslationByBirdIdAndLang(birdId: string, lang: string): Promise<BirdTranslation | null> {
  try {
    const db = await getDb();
    const result = await db.query(`
      SELECT * FROM bird_translations 
      WHERE bird_id = ? AND lang = ? AND deleted_at IS NULL 
      LIMIT 1
    `, [birdId, lang]);
    
    if (result.values && result.values.length > 0) {
      const row = result.values[0];
      return {
        id: row.id,
        bird_id: row.bird_id,
        lang: row.lang,
        description: row.description,
        audio_url: row.audio_url,
        updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
        deleted_at: row.deleted_at ? new Date(row.deleted_at).toISOString() : null
      };
    }
    return null;
  } catch (error) {
    console.error('[DAO] getTranslationByBirdIdAndLang error:', error);
    return null;
  }
}
