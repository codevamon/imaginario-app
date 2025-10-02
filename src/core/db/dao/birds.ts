import { getDb } from '../../sqlite'
import { Capacitor } from '@capacitor/core'
import { fakeBirds } from '../fakeData'

export type Bird = {
  id: string;
  name: string;
  scientific_name?: string;
  image_url?: string;
  rarity?: number;
  popularity?: number;
  updated_at?: string;
  deleted_at?: string | null;
  description?: string;
  size?: string;
  weight?: string;
  stage?: string;
};

export async function listBirds(options?: {
  search?: string;
  rarity?: number; // 0= baja, 1= media, 2= alta, 3= muy alta
  popularity?: 'asc' | 'desc';
  order?: 'name' | 'updated_at';
}): Promise<Bird[]> {
  // Verificar si estamos en modo web y usar datos fake
  if (Capacitor.getPlatform() === 'web') {
    console.warn('[dao-birds] 🚨 usando datos fake en modo web');
    return fakeBirds;
  }

  try {
    const db = await getDb();
    
    // Construir la query base
    let query = 'SELECT * FROM birds WHERE deleted_at IS NULL';
    const params: any[] = [];
    
    // Agregar filtros según las opciones
    if (options?.search) {
      query += ' AND (LOWER(name) LIKE ? OR LOWER(scientific_name) LIKE ?)';
      const searchTerm = `%${options.search.toLowerCase()}%`;
      params.push(searchTerm, searchTerm);
    }
    
    if (options?.rarity !== undefined) {
      query += ' AND rarity = ?';
      params.push(options.rarity);
    }
    
    // Construir ORDER BY
    let orderBy = '';
    
    if (options?.order === 'name') {
      orderBy = 'ORDER BY name COLLATE NOCASE ASC';
    } else if (options?.order === 'updated_at') {
      orderBy = 'ORDER BY updated_at DESC';
    } else {
      // Por defecto ordenar por name
      orderBy = 'ORDER BY name COLLATE NOCASE ASC';
    }
    
    // Agregar ordenamiento por popularidad si se especifica
    if (options?.popularity) {
      if (options.popularity === 'asc') {
        orderBy += ', popularity ASC';
      } else if (options.popularity === 'desc') {
        orderBy += ', popularity DESC';
      }
    }
    
    query += ` ${orderBy}`;
    
    // Ejecutar la query
    const result = await db.query(query, params);
    
    // Convertir los resultados al tipo Bird
    const birds: Bird[] = (result.values || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      scientific_name: row.scientific_name,
      image_url: row.image_url,
      rarity: row.rarity,
      popularity: row.popularity,
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
      description: row.description,
      size: row.size,
      weight: row.weight,
      stage: row.stage
    }));
    
    return birds;
    
  } catch (error) {
    console.error('[DAO] listBirds error:', error);
    return [];
  }
}

export async function getBirdById(id: string): Promise<Bird | null> {
  // Verificar si estamos en modo web y usar datos fake
  if (Capacitor.getPlatform() === 'web') {
    console.warn('[dao-birds] 🚨 usando datos fake en modo web');
    return fakeBirds.find(bird => bird.id === id) || null;
  }

  try {
    const db = await getDb();
    const result = await db.query('SELECT * FROM birds WHERE id = ? AND deleted_at IS NULL LIMIT 1', [id]);
    if (result.values && result.values.length > 0) {
      const row = result.values[0];
      return {
        id: row.id,
        name: row.name,
        scientific_name: row.scientific_name,
        image_url: row.image_url,
        rarity: row.rarity,
        popularity: row.popularity,
        updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
        description: row.description,
        size: row.size,
        weight: row.weight,
        stage: row.stage,
      };
    }
    return null;
  } catch (error) {
    console.error('[DAO] getBirdById error:', error);
    return null;
  }
}