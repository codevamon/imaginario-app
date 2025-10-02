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

export async function getInterviewById(id: string): Promise<Interview | null> {
  // Verificar si estamos en modo web y usar datos fake
  if (Capacitor.getPlatform() === 'web') {
    console.warn('[dao-interviews] 🚨 usando datos fake en modo web');
    return fakeInterviews.find(interview => interview.id === id) || null;
  }

  try {
    const db = await getDb();
    const result = await db.query(`
      SELECT * FROM interviews 
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
        deleted_at: toIsoOrNull(row.deleted_at)
      };
    }
    return null;
  } catch (error) {
    console.error('[DAO] getInterviewById error:', error);
    return null;
  }
}
