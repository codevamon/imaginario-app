// src/core/sync/updateChecker.ts
import { supabase } from '../supabase';
import { Preferences } from '@capacitor/preferences';

type UpdatesSummary = {
  birds: number;
  bird_images: number;
  tracks: number;
  sings: number;
  interviews: number;
};

type UpdatesDiffs = {
  birds: number;
  bird_images: number;
  tracks: number;
  sings: number;
  interviews: number;
};

type CheckUpdatesResult = {
  hasUpdates: boolean;
  diffs: UpdatesDiffs;
};

/**
 * Consulta Supabase por cada tabla para obtener el MAX(updated_at)
 * Retorna un objeto con los timestamps más recientes de cada tabla
 */
export async function getRemoteUpdatesSummary(): Promise<UpdatesSummary> {
  if (!supabase) {
    console.warn('[updateChecker] Supabase no configurado');
    return {
      birds: 0,
      bird_images: 0,
      tracks: 0,
      sings: 0,
      interviews: 0,
    };
  }

  const tables: Array<keyof UpdatesSummary> = [
    'birds',
    'bird_images',
    'tracks',
    'sings',
    'interviews',
  ];

  const summary: UpdatesSummary = {
    birds: 0,
    bird_images: 0,
    tracks: 0,
    sings: 0,
    interviews: 0,
  };

  // Consultar cada tabla para obtener el MAX(updated_at)
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error(`[updateChecker] Error consultando ${table}:`, error);
        summary[table] = 0;
        continue;
      }

      if (data && data.length > 0 && data[0].updated_at) {
        // Convertir a timestamp numérico (parseInt)
        summary[table] = parseInt(String(data[0].updated_at), 10) || 0;
      } else {
        summary[table] = 0;
      }
    } catch (err) {
      console.error(`[updateChecker] Error inesperado en ${table}:`, err);
      summary[table] = 0;
    }
  }

  return summary;
}

/**
 * Lee los timestamps locales desde Preferences
 * Si no existe la clave "local_updates", retorna timestamps 0
 */
export async function getLocalUpdatesSummary(): Promise<UpdatesSummary> {
  try {
    const result = await Preferences.get({ key: 'local_updates' });
    
    if (!result.value) {
      return {
        birds: 0,
        bird_images: 0,
        tracks: 0,
        sings: 0,
        interviews: 0,
      };
    }

    // Parsear el JSON almacenado en Preferences
    const parsed = JSON.parse(result.value) as UpdatesSummary;
    
    // Asegurar que todos los campos existan y sean números
    return {
      birds: parseInt(String(parsed.birds || 0), 10) || 0,
      bird_images: parseInt(String(parsed.bird_images || 0), 10) || 0,
      tracks: parseInt(String(parsed.tracks || 0), 10) || 0,
      sings: parseInt(String(parsed.sings || 0), 10) || 0,
      interviews: parseInt(String(parsed.interviews || 0), 10) || 0,
    };
  } catch (err) {
    console.error('[updateChecker] Error leyendo local_updates:', err);
    return {
      birds: 0,
      bird_images: 0,
      tracks: 0,
      sings: 0,
      interviews: 0,
    };
  }
}

/**
 * Compara los timestamps remotos vs locales
 * Retorna un objeto indicando si hay actualizaciones y las diferencias por tabla
 */
export async function checkForUpdates(): Promise<CheckUpdatesResult> {
  const remote = await getRemoteUpdatesSummary();
  const local = await getLocalUpdatesSummary();

  const diffs: UpdatesDiffs = {
    birds: Math.max(0, remote.birds - local.birds),
    bird_images: Math.max(0, remote.bird_images - local.bird_images),
    tracks: Math.max(0, remote.tracks - local.tracks),
    sings: Math.max(0, remote.sings - local.sings),
    interviews: Math.max(0, remote.interviews - local.interviews),
  };

  const hasUpdates =
    diffs.birds > 0 ||
    diffs.bird_images > 0 ||
    diffs.tracks > 0 ||
    diffs.sings > 0 ||
    diffs.interviews > 0;

  return {
    hasUpdates,
    diffs,
  };
}

