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
  community?: string;
  instruments?: string;
  interpreters?: string;
  author?: string;
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
      deleted_at: toIsoOrNull(row.deleted_at),
      community: row.community,
      instruments: row.instruments,
      interpreters: row.interpreters,
      author: row.author
    }));

    console.log('[DAO] getTracksByBirdId mapped:', tracks.slice(0, 3));
    return tracks;
  } catch (error) {
    console.error('[DAO] getTracksByBirdId error:', error);
    return [];
  }
}

export async function getAllTracks(): Promise<Track[]> {
  if (Capacitor.getPlatform() === 'web') {
    console.warn('[dao-tracks] usando fakeTracks en modo web (getAllTracks)');
    return fakeTracks;
  }

  try {
    const db = await getDb();
    const result = await db.query(`
      SELECT * FROM tracks
      WHERE deleted_at IS NULL
      ORDER BY updated_at DESC
      LIMIT 20
    `);
    
    const tracks: Track[] = (result.values || []).map((row: any) => ({
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
    
    return tracks;
  } catch (error) {
    console.error('[DAO] getAllTracks error:', error);
    return [];
  }
}

export async function listTracks(options?: {
  search?: string;
  order?: 'title' | 'updated_at';
}): Promise<Track[]> {
  if (Capacitor.getPlatform() === 'web') {
    console.warn('[dao-tracks] usando fakeTracks en modo web (listTracks)');
    return fakeTracks;
  }

  try {
    const db = await getDb();
    
    let query = 'SELECT * FROM tracks WHERE deleted_at IS NULL';
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
    
    const tracks: Track[] = (result.values || []).map((row: any) => ({
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
    
    return tracks;
  } catch (error) {
    console.error('[DAO] listTracks error:', error);
    return [];
  }
}
