// Respaldo en la nube. Solo con licencia activa.
// accion 'guardar'  → sube el volcado (JSON) de la barbería.
// accion 'restaurar'→ devuelve el último respaldo.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { supaEnv, supa } from './_supabase.js';

async function licenciaActiva(env: any, codigo: string) {
  const r = await supa(env, `licencias?codigo=eq.${encodeURIComponent(codigo)}&select=estado,vence_en`);
  const lic = (await r.json())?.[0];
  if (!lic) return false;
  const vencida = lic.vence_en && new Date(lic.vence_en).getTime() < Date.now();
  return lic.estado === 'activa' && !vencida;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const env = supaEnv();
  if (!env) return res.status(501).json({ error: 'no_cloud' });

  const { codigo, accion, data, stats } = req.body || {};
  if (!codigo) return res.status(400).json({ error: 'sin_codigo' });

  try {
    if (!(await licenciaActiva(env, codigo))) return res.status(403).json({ error: 'suspendida' });
    const ahora = new Date().toISOString();

    if (accion === 'restaurar') {
      const r = await supa(env, `respaldos?codigo=eq.${encodeURIComponent(codigo)}&select=data,actualizado_en`);
      const fila = (await r.json())?.[0];
      return res.status(200).json({ data: fila?.data ?? null, actualizado_en: fila?.actualizado_en ?? null });
    }

    // guardar (upsert)
    if (!data) return res.status(400).json({ error: 'sin_data' });
    await supa(env, 'respaldos', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ codigo, data, stats: stats ?? {}, actualizado_en: ahora }),
    });
    await supa(env, `licencias?codigo=eq.${encodeURIComponent(codigo)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ ultimo_uso: ahora, stats: stats ?? {} }),
    });
    return res.status(200).json({ ok: true, actualizado_en: ahora });
  } catch (e: any) {
    return res.status(500).json({ error: 'server', detail: String(e?.message ?? e).slice(0, 200) });
  }
}
