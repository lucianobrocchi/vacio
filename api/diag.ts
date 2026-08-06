// Diagnóstico de la conexión con Supabase. Abrir en el navegador:
//   https://TU-DOMINIO/api/diag?token=TU_ADMIN_TOKEN
// Devuelve JSON con qué variables están, la URL normalizada y el resultado
// crudo de una consulta a `licencias`. No expone las claves.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { supaEnv } from './_supabase';

export default async function handler(req: any, res: any) {
  // Todo el handler va dentro de un try: si algo explota, devolvemos el error
  // como JSON en vez de tirar la función (FUNCTION_INVOCATION_FAILED).
  try {
    const token = req.query?.token;
    if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
      return res
        .status(401)
        .json({ error: 'no_autorizado', tiene_ADMIN_TOKEN: !!process.env.ADMIN_TOKEN });
    }

    const out: any = {
      node: process.version,
      tiene_fetch: typeof fetch !== 'undefined',
      tiene_AbortController: typeof AbortController !== 'undefined',
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

    if (typeof fetch === 'undefined') {
      out.error = 'este runtime no tiene fetch global (Node muy viejo)';
      return res.status(200).json(out);
    }

    // Consulta de prueba a `licencias`, con timeout defensivo si hay AbortController.
    try {
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
      const t = ctrl ? setTimeout(() => ctrl.abort(), 8000) : undefined;
      try {
        const r = await fetch(`${env.url}/rest/v1/licencias?select=codigo&limit=1`, {
          headers: { apikey: env.key, Authorization: `Bearer ${env.key}` },
          signal: ctrl?.signal,
        });
        const body = await r.text();
        out.prueba_licencias = { status: r.status, ok: r.ok, body: body.slice(0, 300) };
      } finally {
        if (t) clearTimeout(t);
      }
    } catch (e: any) {
      out.prueba_licencias = {
        error: String(e?.message ?? e).slice(0, 300),
        nombre: e?.name,
        causa: String(e?.cause?.message ?? e?.cause ?? '').slice(0, 200),
      };
    }

    return res.status(200).json(out);
  } catch (e: any) {
    // Cualquier cosa inesperada: la mostramos en vez de tirar la función.
    return res.status(200).json({
      crash: true,
      nombre: e?.name,
      mensaje: String(e?.message ?? e).slice(0, 300),
      stack: String(e?.stack ?? '').slice(0, 600),
    });
  }
}
