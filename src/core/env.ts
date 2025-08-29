// src/core/env.ts
type Env = { supabaseUrl: string; supabaseAnonKey: string };

function readEnv(): Env {
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  if (!url || !key) {
    // Aviso no bloqueante: en dev seguimos funcionando sin red
    console.warn('[env] Supabase no configurado (url/key vacíos). Funciona offline.');
  }
  return { supabaseUrl: url, supabaseAnonKey: key };
}

export const env = readEnv();
