import { getDb } from '../../sqlite'
import { toIso, toIsoOrNull } from './utils/dateHelpers'
import { Capacitor } from '@capacitor/core'
import { fakeInterviews } from '../fakeData'

export type Interview = {
  id: string;
  bird_id: string;
  title?: string;
  audio_url: string;
  duration_ms?: number;
  updated_at?: string;
  deleted_at?: string | null;
};

export async function getInterviewsByBirdId(birdId: string): Promise<Interview[]> {
  // Verificar si estamos en modo web y usar datos fake
  if (Capacitor.getPlatform() === 'web') {
    console.warn('[dao-interviews] 🚨 usando datos fake en modo web');
    return fakeInterviews.filter(interview => interview.bird_id === birdId);
  }

  try {
    const db = await getDb();
    const result = await db.query(`
      SELECT * FROM interviews 
      WHERE bird_id = ? AND deleted_at IS NULL 
      ORDER BY title COLLATE NOCASE ASC, updated_at DESC
    `, [birdId]);

    const interviews: Interview[] = (result.values || []).map((row: any) => ({
      id: row.id,
      bird_id: row.bird_id,
      title: row.title,
      audio_url: row.audio_url ?? null,
      duration_ms: row.duration_ms,
      updated_at: toIso(row.updated_at),
      deleted_at: toIsoOrNull(row.deleted_at)
    }));

    console.log('[DAO] getInterviewsByBirdId mapped:', interviews.slice(0, 3));
    return interviews;
  } catch (error) {
    console.error('[DAO] getInterviewsByBirdId error:', error);
    return [];
  }
}

export async function getAllInterviews(): Promise<Interview[]> {
  if (Capacitor.getPlatform() === 'web') {
    console.warn('[dao-interviews] usando fakeInterviews en modo web (getAllInterviews)');
    return fakeInterviews;
  }

  try {
    const db = await getDb();
    const result = await db.query(`
      SELECT * FROM interviews
      WHERE deleted_at IS NULL
      ORDER BY updated_at DESC
    `);
    
    const interviews: Interview[] = (result.values || []).map((row: any) => ({
      id: row.id,
      bird_id: row.bird_id,
      title: row.title,
      audio_url: row.audio_url ?? null,
      duration_ms: row.duration_ms,
      updated_at: toIso(row.updated_at),
      deleted_at: toIsoOrNull(row.deleted_at)
    }));
    
    return interviews;
  } catch (error) {
    console.error('[DAO] getAllInterviews error:', error);
    return [];
  }
}

export async function listInterviews(options?: {
  search?: string;
  order?: 'title' | 'updated_at';
}): Promise<Interview[]> {
  if (Capacitor.getPlatform() === 'web') {
    console.warn('[dao-interviews] usando fakeInterviews en modo web (listInterviews)');
    return fakeInterviews;
  }

  try {
    const db = await getDb();
    
    let query = 'SELECT * FROM interviews WHERE deleted_at IS NULL';
    const params: any[] = [];
    
    if (options?.search) {
      query += ' AND LOWER(title) LIKE ?';
      const searchTerm = `%${options.search.toLowerCase()}%`;
      params.push(searchTerm);
    }
    
    if (options?.order === 'title') {
      query += ' ORDER BY title COLLATE NOCASE ASC';
    } else {
      query += ' ORDER BY updated_at DESC';
    }
    
    const result = await db.query(query, params);
    
    const interviews: Interview[] = (result.values || []).map((row: any) => ({
      id: row.id,
      bird_id: row.bird_id,
      title: row.title,
      audio_url: row.audio_url ?? null,
      duration_ms: row.duration_ms,
      updated_at: toIso(row.updated_at),
      deleted_at: toIsoOrNull(row.deleted_at)
    }));
    
    return interviews;
  } catch (error) {
    console.error('[DAO] listInterviews error:', error);
    return [];
  }
}
