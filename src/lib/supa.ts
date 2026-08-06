// Cliente de Supabase para el navegador (Modelo B: sync en vivo).
// Usa las claves PÚBLICAS (VITE_*). La sesión de la barbería se persiste
// sola (supabase-js) y RLS aísla los datos de cada barbería.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/rest\/v1\/?$/, '');
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let cliente: SupabaseClient | null = null;

/** ¿La nube (Supabase) está configurada en este build? */
export function supaConfigurado(): boolean {
  return !!(url && anon);
}

/** Cliente de Supabase (singleton) o null si no está configurado. */
export function supa(): SupabaseClient | null {
  if (!url || !anon) return null;
  if (!cliente) {
    cliente = createClient(url, anon, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'corte.supa.auth' },
      realtime: { params: { eventsPerSecond: 5 } },
    });
  }
  return cliente;
}
