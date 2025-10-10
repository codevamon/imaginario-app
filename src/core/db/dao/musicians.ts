import { getDb } from '../../sqlite';
import { Capacitor } from '@capacitor/core';
import { fakeMusicians } from '../fakeData';

export type Musician = {
  id: string;
  bird_id: string;
  name: string;
  bio?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

export async function getAllMusicians(): Promise<Musician[]> {
  if (Capacitor.getPlatform() === 'web') {
    console.warn('[dao-musicians] usando fakeMusicians en modo web (getAllMusicians)');
    return fakeMusicians;
  }

  try {
    const db = await getDb();
    const result = await db.query(`
      SELECT * FROM musicians
      WHERE deleted_at IS NULL
      ORDER BY updated_at DESC
      LIMIT 20
    `);
    
    const musicians: Musician[] = (result.values || []).map((row: any) => ({
      id: row.id,
      bird_id: row.bird_id,
      name: row.name,
      bio: row.bio,
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
      deleted_at: row.deleted_at ? new Date(row.deleted_at).toISOString() : null
    }));
    
    return musicians;
  } catch (error) {
    console.error('[DAO] getAllMusicians error:', error);
    return [];
  }
}

export async function listMusicians(options?: {
  search?: string;
  order?: 'name' | 'updated_at';
}): Promise<Musician[]> {
  if (Capacitor.getPlatform() === 'web') {
    console.warn('[dao-musicians] usando fakeMusicians en modo web (listMusicians)');
    return fakeMusicians;
  }

  try {
    const db = await getDb();
    
    let query = 'SELECT * FROM musicians WHERE deleted_at IS NULL';
    const params: any[] = [];
    
    if (options?.search) {
      query += ' AND (LOWER(name) LIKE ? OR LOWER(bio) LIKE ?)';
      const searchTerm = `%${options.search.toLowerCase()}%`;
      params.push(searchTerm, searchTerm);
    }
    
    if (options?.order === 'name') {
      query += ' ORDER BY name COLLATE NOCASE ASC';
    } else {
      query += ' ORDER BY updated_at DESC';
    }
    
    const result = await db.query(query, params);
    
    const musicians: Musician[] = (result.values || []).map((row: any) => ({
      id: row.id,
      bird_id: row.bird_id,
      name: row.name,
      bio: row.bio,
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
      deleted_at: row.deleted_at ? new Date(row.deleted_at).toISOString() : null
    }));
    
    return musicians;
  } catch (error) {
    console.error('[DAO] listMusicians error:', error);
    return [];
  }
}
