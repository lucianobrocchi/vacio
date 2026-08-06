// Cliente de la nube (licencias + respaldo + admin). Habla con las funciones
// serverless /api/licencia, /api/backup, /api/admin. Si Supabase no está
// configurado, las funciones devuelven 501 y la app corre en modo libre/local.

import { exportarDatos, importarDatos, resumenDatos } from '../db/backup';
import { obtenerConfig, actualizarConfig } from '../db/config';

export interface EstadoNube {
  /** ¿La nube está configurada (Supabase presente)? */
  cloud: boolean;
  /** ¿La licencia de este dispositivo está activa? */
  activada: boolean;
  estado?: string; // activa | suspendida | vencida
  barberia?: string;
  plan?: string;
  vence?: string;
  error?: string;
}

/** Consulta el estado de la licencia y late (heartbeat + stats). */
export async function chequearLicencia(codigo?: string): Promise<EstadoNube> {
  try {
    const stats = codigo ? await resumenDatos() : undefined;
    const config = await obtenerConfig();
    const resp = await fetch('/api/licencia', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ codigo, barberia: config?.nombreBarberia, stats }),
    });
    if (resp.status === 501) return { cloud: false, activada: false };
    const data = await resp.json();
    return { cloud: true, ...data };
  } catch {
    // Sin conexión: no bloqueamos (modo optimista, se revalida después).
    return { cloud: false, activada: false, error: 'sin_conexion' };
  }
}

/** Sube el respaldo de la barbería a la nube. */
export async function respaldarAhora(codigo: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const [data, stats] = await Promise.all([exportarDatos(), resumenDatos()]);
    const resp = await fetch('/api/backup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ codigo, accion: 'guardar', data, stats }),
    });
    if (!resp.ok) return { ok: false, error: `${resp.status}` };
    await actualizarConfig({ ultimoRespaldoEn: Date.now() });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** Trae el último respaldo de la nube y lo restaura en el dispositivo. */
export async function restaurarDesdeNube(codigo: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const resp = await fetch('/api/backup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ codigo, accion: 'restaurar' }),
    });
    if (!resp.ok) return { ok: false, error: `${resp.status}` };
    const { data } = await resp.json();
    if (!data) return { ok: false, error: 'vacio' };
    await importarDatos(data);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// ---- Admin ----

export interface LicenciaAdmin {
  codigo: string;
  barberia?: string;
  plan: string;
  estado: string;
  creada_en: string;
  vence_en?: string;
  ultimo_uso?: string;
  stats?: Record<string, number>;
  nota?: string;
}

async function admin(token: string, body: Record<string, unknown>): Promise<any> {
  const resp = await fetch('/api/admin', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token, ...body }),
  });
  if (resp.status === 401) throw new Error('no_autorizado');
  if (resp.status === 501) throw new Error('no_cloud');
  if (!resp.ok) {
    const d = await resp.json().catch(() => ({}));
    throw new Error(d.detail || d.error || `error_${resp.status}`);
  }
  return resp.json();
}

export const adminListar = (token: string) =>
  admin(token, { accion: 'listar' }).then((d) => d.licencias as LicenciaAdmin[]);
export const adminCrear = (
  token: string,
  datos: { barberia?: string; plan?: string; dias?: number; nota?: string },
) => admin(token, { accion: 'crear', ...datos }).then((d) => d.licencia as LicenciaAdmin);
export const adminRevocar = (token: string, codigo: string) => admin(token, { accion: 'revocar', codigo });
export const adminActivar = (token: string, codigo: string) => admin(token, { accion: 'activar', codigo });
export const adminBorrar = (token: string, codigo: string) => admin(token, { accion: 'borrar', codigo });
export const adminCambiarPlan = (token: string, codigo: string, plan: string) =>
  admin(token, { accion: 'plan', codigo, plan });
