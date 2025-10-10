import { getDb } from '../../sqlite'
import { toIso, toIsoOrNull } from './utils/dateHelpers'
import { Capacitor } from '@capacitor/core'
import { fakeSings } from '../fakeData'

export type Sing = {
  id: string;
  bird_id: string;
  title?: string;
  audio_url: string;
  duration_ms?: number;
  updated_at?: string;
  deleted_at?: string | null;
  community?: string;
  instruments?: string;
  interpreters?: string;
  author?: string;
};

export async function getSingsByBirdId(birdId: string): Promise<Sing[]> {
  // Verificar si estamos en modo web y usar datos fake
  if (Capacitor.getPlatform() === 'web') {
    console.warn('[dao-sings] 🚨 usando datos fake en modo web');
    return fakeSings.filter(sing => sing.bird_id === birdId);
  }

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
      audio_url: row.audio_url ?? null,
      duration_ms: row.duration_ms,
      updated_at: toIso(row.updated_at),
      deleted_at: toIsoOrNull(row.deleted_at),
      community: row.community,
      instruments: row.instruments,
      interpreters: row.interpreters,
      author: row.author
    }));
    
    console.log('[DAO] getSingsByBirdId mapped:', sings.slice(0, 3));
    return sings;
    
  } catch (error) {
    console.error('[DAO] getSingsByBirdId error:', error);
    return [];
  }
}

export async function getSingById(id: string): Promise<Sing | null> {
  // Verificar si estamos en modo web y usar datos fake
  if (Capacitor.getPlatform() === 'web') {
    console.warn('[dao-sings] 🚨 usando datos fake en modo web');
    return fakeSings.find(sing => sing.id === id) || null;
  }

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
        audio_url: row.audio_url ?? null,
        duration_ms: row.duration_ms,
        updated_at: toIso(row.updated_at),
        deleted_at: toIsoOrNull(row.deleted_at),
        community: row.community,
        instruments: row.instruments,
        interpreters: row.interpreters,
        author: row.author
      };
    }
    return null;
  } catch (error) {
    console.error('[DAO] getSingById error:', error);
    return null;
  }
}

export async function getAllSings(): Promise<Sing[]> {
  if (Capacitor.getPlatform() === 'web') {
    console.warn('[dao-sings] usando fakeSings en modo web (getAllSings)');
    return fakeSings;
  }

  const db = await getDb();
  const result = await db.query(`
    SELECT * FROM sings
    WHERE deleted_at IS NULL
    ORDER BY updated_at DESC
    LIMIT 20
  `);
  return result.values as Sing[];
}

export async function listSings(options?: {
  search?: string;
  order?: 'title' | 'updated_at';
}): Promise<Sing[]> {
  if (Capacitor.getPlatform() === 'web') {
    console.warn('[dao-sings] usando fakeSings en modo web (listSings)');
    return fakeSings;
  }

  try {
    const db = await getDb();
    
    let query = 'SELECT * FROM sings WHERE deleted_at IS NULL';
    const params: any[] = [];
    
    if (options?.search) {
      query += ' AND (LOWER(title) LIKE ? OR LOWER(author) LIKE ? OR LOWER(community) LIKE ?)';
      const searchTerm = `%${options.search.toLowerCase()}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (options?.order === 'title') {
      query += ' ORDER BY title COLLATE NOCASE ASC';
    } else {
      query += ' ORDER BY updated_at DESC';
    }
    
    const result = await db.query(query, params);
    
    const sings: Sing[] = (result.values || []).map((row: any) => ({
      id: row.id,
      bird_id: row.bird_id,
      title: row.title,
      audio_url: row.audio_url ?? null,
      duration_ms: row.duration_ms,
      updated_at: toIso(row.updated_at),
      deleted_at: toIsoOrNull(row.deleted_at),
      community: row.community,
      instruments: row.instruments,
      interpreters: row.interpreters,
      author: row.author
    }));
    
    return sings;
  } catch (error) {
    console.error('[DAO] listSings error:', error);
    return [];
  }
}