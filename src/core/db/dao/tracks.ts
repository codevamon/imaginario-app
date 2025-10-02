import { getDb } from '../../sqlite'
import { toIso, toIsoOrNull } from './utils/dateHelpers'
import { Capacitor } from '@capacitor/core'
import { fakeTracks } from '../fakeData'

export type Track = {
  id: string;
  bird_id: string;
  title?: string;
  audio_url: string;
  duration_ms?: number;
  updated_at?: string;
  deleted_at?: string | null;
};

export async function getTracksByBirdId(birdId: string): Promise<Track[]> {
  // Verificar si estamos en modo web y usar datos fake
  if (Capacitor.getPlatform() === 'web') {
    console.warn('[dao-tracks] 🚨 usando datos fake en modo web');
    return fakeTracks.filter(track => track.bird_id === birdId);
  }

  try {
    const db = await getDb();
    const result = await db.query(`
      SELECT * FROM tracks 
      WHERE bird_id = ? AND deleted_at IS NULL 
      ORDER BY title COLLATE NOCASE ASC, updated_at DESC
    `, [birdId]);

    const tracks: Track[] = (result.values || []).map((row: any) => ({
      id: row.id,
      bird_id: row.bird_id,
      title: row.title,
      audio_url: row.audio_url ?? null,
      duration_ms: row.duration_ms,
      updated_at: toIso(row.updated_at),
      deleted_at: toIsoOrNull(row.deleted_at)
    }));

    console.log('[DAO] getTracksByBirdId mapped:', tracks.slice(0, 3));
    return tracks;
  } catch (error) {
    console.error('[DAO] getTracksByBirdId error:', error);
    return [];
  }
}

export async function getTrackById(id: string): Promise<Track | null> {
  // Verificar si estamos en modo web y usar datos fake
  if (Capacitor.getPlatform() === 'web') {
    console.warn('[dao-tracks] 🚨 usando datos fake en modo web');
    return fakeTracks.find(track => track.id === id) || null;
  }

  try {
    const db = await getDb();
    const result = await db.query(`
      SELECT * FROM tracks 
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
    console.error('[DAO] getTrackById error:', error);
    return null;
  }
}
