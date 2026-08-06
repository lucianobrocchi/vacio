// Activación de la barbería para el sync en vivo (Modelo B).
// Dado un código de licencia activo, garantiza que exista la "cuenta" de
// Supabase Auth de esa barbería y devuelve sus credenciales (email + password
// derivado, no se guarda en claro) para que el dispositivo inicie sesión.
// Todos los barberos de la misma barbería comparten esa cuenta → ven lo mismo.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHmac } from 'crypto';
import { supaEnv, supa } from './_supabase';

function emailDe(codigo: string): string {
  return `barberia-${codigo.toLowerCase().replace(/[^a-z0-9]/g, '')}@corte.app`;
}
/** Password determinístico por código (no se almacena; se recalcula). */
function passwordDe(codigo: string, secreto: string): string {
  return createHmac('sha256', secreto).update(`corte:${codigo}`).digest('base64url').slice(0, 32);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const env = supaEnv();
  if (!env) return res.status(501).json({ error: 'no_cloud' });

  const { codigo, barberia } = req.body || {};
  if (!codigo) return res.status(400).json({ error: 'sin_codigo' });

  try {
    const r = await supa(env, `licencias?codigo=eq.${encodeURIComponent(codigo)}&select=*`);
    const lic = (await r.json())?.[0];
    if (!lic) return res.status(200).json({ activada: false, error: 'invalido' });
    const vencida = lic.vence_en && new Date(lic.vence_en).getTime() < Date.now();
    if (lic.estado !== 'activa' || vencida)
      return res.status(200).json({ activada: false, estado: vencida ? 'vencida' : lic.estado });

    const email = lic.auth_email || emailDe(codigo);
    const password = passwordDe(codigo, env.key);
    let uid = lic.auth_uid;

    // Crear la cuenta de la barbería si todavía no existe.
    if (!uid) {
      const cr = await fetch(`${env.url}/auth/v1/admin/users`, {
        method: 'POST',
        headers: { apikey: env.key, Authorization: `Bearer ${env.key}`, 'content-type': 'application/json' },
        body: JSON.stringify({ email, password, email_confirm: true }),
      });
      const u = await cr.json();
      if (u?.id) {
        uid = u.id;
      } else if (cr.status === 422 || /exist/i.test(JSON.stringify(u))) {
        // Ya existía: la buscamos por email para tomar su uid.
        const q = await fetch(
          `${env.url}/auth/v1/admin/users?filter=${encodeURIComponent(`email eq "${email}"`)}`,
          { headers: { apikey: env.key, Authorization: `Bearer ${env.key}` } },
        );
        const lista = await q.json();
        uid = lista?.users?.[0]?.id;
      }
      if (!uid) return res.status(500).json({ error: 'auth', detail: 'no se pudo crear la cuenta' });
      await supa(env, `licencias?codigo=eq.${encodeURIComponent(codigo)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ auth_uid: uid, auth_email: email }),
      });
    }

    // Heartbeat + nombre.
    await supa(env, `licencias?codigo=eq.${encodeURIComponent(codigo)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ ultimo_uso: new Date().toISOString(), barberia: barberia || lic.barberia }),
    });

    return res.status(200).json({
      activada: true,
      email,
      password,
      ownerId: uid,
      barberia: lic.barberia,
      plan: lic.plan,
    });
  } catch (e: any) {
    return res.status(500).json({ error: 'server', detail: String(e?.message ?? e).slice(0, 200) });
  }
}
