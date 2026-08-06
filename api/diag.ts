// Diagnóstico de la conexión con Supabase. Abrir en el navegador:
//   https://TU-DOMINIO/api/diag?token=TU_ADMIN_TOKEN
// Devuelve JSON con qué variables están, la URL normalizada y el resultado
// crudo de una consulta a `licencias`. No expone las claves.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { supaEnv } from './_supabase';

export default async function handler(req: any, res: any) {
  const token = req.query?.token;
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'no_autorizado', tiene_ADMIN_TOKEN: !!process.env.ADMIN_TOKEN });
  }

  const out: any = {
    tiene_SUPABASE_URL: !!process.env.SUPABASE_URL,
    tiene_SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
    service_key_empieza: (process.env.SUPABASE_SERVICE_KEY || '').slice(0, 10),
    tiene_VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
    tiene_VITE_SUPABASE_ANON_KEY: !!process.env.VITE_SUPABASE_ANON_KEY,
  };

  const env = supaEnv();
  if (!env) {
    out.error = 'faltan SUPABASE_URL o SUPABASE_SERVICE_KEY';
    return res.status(200).json(out);
  }
  out.url_normalizada = env.url;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(`${env.url}/rest/v1/licencias?select=codigo&limit=1`, {
      headers: { apikey: env.key, Authorization: `Bearer ${env.key}` },
      signal: ctrl.signal,
    });
    const body = await r.text();
    out.prueba_licencias = { status: r.status, ok: r.ok, body: body.slice(0, 300) };
  } catch (e: any) {
    out.prueba_licencias = { error: String(e?.message ?? e).slice(0, 300) };
  } finally {
    clearTimeout(t);
  }
  return res.status(200).json(out);
}
