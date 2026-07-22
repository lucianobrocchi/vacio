// Estado de la licencia / activación. El front la llama al arrancar.
// - Sin Supabase configurado → 501 (la app corre en modo libre/local).
// - Con código → valida, marca "último uso" y devuelve el estado.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { supaEnv, supa } from './_supabase';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const env = supaEnv();
  if (!env) return res.status(501).json({ error: 'no_cloud' });

  const { codigo, barberia, stats } = req.body || {};
  if (!codigo) return res.status(200).json({ cloud: true, activada: false });

  try {
    const r = await supa(env, `licencias?codigo=eq.${encodeURIComponent(codigo)}&select=*`);
    const filas = await r.json();
    const lic = filas?.[0];
    if (!lic) return res.status(200).json({ cloud: true, activada: false, error: 'invalido' });

    const vencida = lic.vence_en && new Date(lic.vence_en).getTime() < Date.now();
    const activa = lic.estado === 'activa' && !vencida;

    // Marca uso (heartbeat) y actualiza barbería/stats si vinieron.
    const patch: any = { ultimo_uso: new Date().toISOString() };
    if (barberia) patch.barberia = barberia;
    if (stats) patch.stats = stats;
    await supa(env, `licencias?codigo=eq.${encodeURIComponent(codigo)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(patch),
    });

    return res.status(200).json({
      cloud: true,
      activada: activa,
      estado: vencida ? 'vencida' : lic.estado,
      barberia: lic.barberia,
      plan: lic.plan,
      vence: lic.vence_en,
    });
  } catch (e: any) {
    return res.status(500).json({ error: 'server', detail: String(e?.message ?? e).slice(0, 200) });
  }
}
