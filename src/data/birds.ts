import { supabase } from '../lib/supabaseClient';

export type Bird = {
  id: string;
  name: string;
  description: string | null;
  rarity: number | null;
  popularity: number | null;
  tags: string | null;
  image_url: string | null;
  updated_at: number;
  deleted_at: number | null;
};

export async function fetchBirds(): Promise<Bird[]> {
  const { data, error } = await supabase
    .from('birds')
    .select('*')
    .is('deleted_at', null)   // por si en algún momento marcas bajas lógicas
    .order('popularity', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
