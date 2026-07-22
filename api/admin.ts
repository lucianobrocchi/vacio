// Panel admin (solo Luciano). Protegido por ADMIN_TOKEN.
// acciones: listar · crear · revocar · activar · borrar

/* eslint-disable @typescript-eslint/no-explicit-any */
import { supaEnv, supa, generarCodigo } from './_supabase';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const env = supaEnv();
  if (!env) return res.status(501).json({ error: 'no_cloud' });

  const admin = process.env.ADMIN_TOKEN;
  const { token, accion, codigo, barberia, plan, dias, nota } = req.body || {};
  if (!admin || token !== admin) return res.status(401).json({ error: 'no_autorizado' });

  try {
    if (accion === 'listar') {
      const r = await supa(
        env,
        'licencias?select=codigo,barberia,plan,estado,creada_en,vence_en,ultimo_uso,stats,nota&order=ultimo_uso.desc.nullslast',
      );
      return res.status(200).json({ licencias: await r.json() });
    }

    if (accion === 'crear') {
      const nuevo = {
        codigo: generarCodigo(),
        barberia: barberia || null,
        plan: plan || 'trial',
        nota: nota || null,
        vence_en: dias ? new Date(Date.now() + dias * 86400000).toISOString() : null,
      };
      const r = await supa(env, 'licencias', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(nuevo),
      });
      const fila = (await r.json())?.[0];
      return res.status(200).json({ licencia: fila });
    }

    if (accion === 'revocar' || accion === 'activar') {
      if (!codigo) return res.status(400).json({ error: 'sin_codigo' });
      await supa(env, `licencias?codigo=eq.${encodeURIComponent(codigo)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ estado: accion === 'revocar' ? 'suspendida' : 'activa' }),
      });
      return res.status(200).json({ ok: true });
    }

    if (accion === 'borrar') {
      if (!codigo) return res.status(400).json({ error: 'sin_codigo' });
      await supa(env, `licencias?codigo=eq.${encodeURIComponent(codigo)}`, {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'accion_desconocida' });
  } catch (e: any) {
    return res.status(500).json({ error: 'server', detail: String(e?.message ?? e).slice(0, 200) });
  }
}
