import { getDb } from '../../sqlite'
import { toIso, toIsoOrNull } from './utils/dateHelpers'
import { Capacitor } from '@capacitor/core'
import { fakeTracks } from '../fakeData'
// TODO: agregar columna cached_path TEXT en tracks en la próxima migración.

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
  instruments?: string[];
}): Promise<Track[]> {
  if (Capacitor.getPlatform() === 'web') {
    console.warn('[dao-tracks] usando fakeTracks en modo web (listTracks)');
    // Aplicar filtros en memoria para modo web
    let filtered = [...fakeTracks];
    
    if (options?.search) {
      const searchLower = options.search.toLowerCase();
      filtered = filtered.filter(t => 
        t.title?.toLowerCase().includes(searchLower) ||
        t.author?.toLowerCase().includes(searchLower) ||
        t.community?.toLowerCase().includes(searchLower)
      );
    }
    
    if (options?.instruments && options.instruments.length > 0) {
      filtered = filtered.filter(t => {
        if (!t.instruments) return false;
        const trackInstruments = t.instruments.split(',').map(i => i.trim());
        return options.instruments!.some(inst => trackInstruments.includes(inst));
      });
    }
    
    return filtered;
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
    
    // Filtro de instrumentos: el track debe contener al menos uno de los instrumentos seleccionados
    if (options?.instruments && options.instruments.length > 0) {
      const instrumentConditions = options.instruments.map(() => 
        'LOWER(instruments) LIKE ?'
      ).join(' OR ');
      query += ` AND (${instrumentConditions})`;
      
      options.instruments.forEach(instrument => {
        params.push(`%${instrument.toLowerCase()}%`);
      });
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

export async function updateCachedPath(id: string, cachedPath: string): Promise<void> {
  try {
    const db = await getDb();
    const query = 'UPDATE tracks SET cached_path = ? WHERE id = ?';
    await db.run(query, [cachedPath, id]);
    console.log('[DAO] cached_path actualizado:', id, cachedPath);
  } catch (err) {
    console.warn('[DAO] Error al actualizar cached_path:', err);
  }
}
