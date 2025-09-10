import { supabase } from '../lib/supabaseClient';
import type { Bird } from '../core/db/dao/birds';

export async function fetchBirds(): Promise<Bird[]> {
  const { data, error } = await supabase
    .from('birds')
    .select('*')
    .is('deleted_at', null)   // por si en algún momento marcas bajas lógicas
    .order('popularity', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
