// Helper compartido por las funciones serverless (archivo _ = no es una ruta).
// La service key vive solo en el servidor (env de Vercel).

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface SupaEnv {
  url: string;
  key: string;
}

export function supaEnv(): SupaEnv | null {
  let url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  // Tolerante: aceptar la URL con o sin "/rest/v1/" o barra final.
  url = url.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
  return { url, key };
}

/** Llama a la REST API de Supabase (PostgREST) con la service key. */
export async function supa(env: SupaEnv, path: string, init: any = {}): Promise<Response> {
  return fetch(`${env.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.key,
      Authorization: `Bearer ${env.key}`,
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

/** Código de licencia legible: CORTE-XXXX-XXXX. */
export function generarCodigo(): string {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bloque = () =>
    Array.from({ length: 4 }, () => abc[Math.floor(Math.random() * abc.length)]).join('');
  return `CORTE-${bloque()}-${bloque()}`;
}
