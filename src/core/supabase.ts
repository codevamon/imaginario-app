// src/core/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

export let supabase: SupabaseClient | null = null;

if (env.supabaseUrl && env.supabaseAnonKey) {
  supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false },
  });
}
