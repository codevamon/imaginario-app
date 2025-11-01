// src/core/db/dao/utils/fetchFallback.ts
import { supabase } from '../../../supabase';

type SupabaseResult = {
  data: any[] | null;
  error: any | null;
};

/**
 * Si window.__fakeDB__ === true → devuelve datos desde Supabase.
 * Si no está activo → devuelve null (indica que el DAO debe continuar con su flujo normal).
 */
export async function fetchFromSupabaseIfFake(table: string, opts?: { orderBy?: string, limit?: number }): Promise<SupabaseResult | null> {
  try {
    if (!(window as any).__fakeDB__) return null;

    console.warn(`[fetchFallback] Modo FAKE activo — cargando tabla '${table}' desde Supabase`);

    let query = supabase.from(table).select('*');

    if (opts?.orderBy) {
      query = query.order(opts.orderBy as string, { ascending: false } as any);
    }
    if (opts?.limit) {
      query = query.limit(opts.limit);
    }

    const { data, error } = await query;
    if (error) {
      console.error(`[fetchFallback] Error Supabase tabla ${table}`, error);
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('[fetchFallback] Excepción inesperada', err);
    return { data: null, error: err };
  }
}

