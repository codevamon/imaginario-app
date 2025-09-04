// src/core/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

export let supabase: SupabaseClient;

if (env.supabaseUrl && env.supabaseAnonKey) {
  supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false },
  });
} else {
  // Fallback para desarrollo - usar valores por defecto o lanzar error
  throw new Error('Supabase URL y Anon Key son requeridos en las variables de entorno');
}
