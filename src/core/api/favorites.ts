// src/core/api/favorites.ts
import { supabase } from '../supabase';
import { getDeviceId } from '../session/device';
import { setLocalFavorite } from '../db/dao';

export async function toggleFavorite(bird_id: string) {
  if (!supabase) throw new Error('Supabase no configurado');
  const deviceId = await getDeviceId();
  const { data, error } = await supabase.functions.invoke('favorites-toggle', {
    body: { bird_id },
    headers: { 'x-device-id': deviceId }
  });
  if (error) throw error;
  // refleja local
  if (data?.added) await setLocalFavorite(bird_id, true);
  if (data?.removed) await setLocalFavorite(bird_id, false);
  return data as { added?: boolean; removed?: boolean };
}
