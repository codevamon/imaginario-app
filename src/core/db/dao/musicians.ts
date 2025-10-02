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

export async function getMusiciansByBirdId(birdId: string): Promise<Musician[]> {
  // Verificar si estamos en modo web y usar datos fake
  if (Capacitor.getPlatform() === 'web') {
    console.warn('[dao-musicians] 🚨 usando datos fake en modo web');
    return fakeMusicians.filter(musician => musician.bird_id === birdId);
  }

  try {
    const db = await getDb();
    console.log('[DAO] 🎭 getMusiciansByBirdId - birdId:', birdId);
    
    // Verificar esquema de la tabla
    const pragmaResult = await db.query('PRAGMA table_info(musicians)');
    console.log('[DAO] 🎭 PRAGMA table_info(musicians):', pragmaResult.values);
    
    const result = await db.query(`
      SELECT * FROM musicians 
      WHERE bird_id = ? AND deleted_at IS NULL 
      ORDER BY updated_at DESC, name COLLATE NOCASE ASC
    `, [birdId]);
    
    console.log('[DAO] 🎭 getMusiciansByBirdId - raw rows:', result.values);
    console.log('[DAO] 🎭 getMusiciansByBirdId - row count:', result.values?.length || 0);
    
    // Convertir los resultados al tipo Musician
    const musicians: Musician[] = (result.values || []).map((row: any) => ({
      id: row.id,
      bird_id: row.bird_id,
      name: row.name,
      bio: row.bio,
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
      deleted_at: row.deleted_at ? new Date(row.deleted_at).toISOString() : null
    }));
    
    console.log('[DAO] 🎭 getMusiciansByBirdId - musicians mapped:', musicians);
    console.log('[DAO] 🎭 getMusiciansByBirdId - final count:', musicians.length);
    
    return musicians;
    
  } catch (error) {
    console.error('[DAO] 🎭 getMusiciansByBirdId error:', error);
    return [];
  }
}
