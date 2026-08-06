// Motor de sync en vivo (Modelo B). Supabase como fuente compartida por
// barbería; cada dispositivo mantiene su copia local (Dexie) para andar
// offline. Estrategia: last-write-wins por `updatedAt`, con tombstones para
// borrados. Detrás del flag VITE_SYNC_VIVO para poder activarlo con cuidado.
//
// IMPORTANTE: es best-effort. Si algo falla, la app sigue andando local y el
// respaldo snapshot (lib/nube) queda como red de seguridad.

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Table } from 'dexie';
import { supa } from './supa';
import { db } from '../db/db';
import { flags, pendientes, encolarCambio } from './syncCola';
import { obtenerConfig } from '../db/config';
import type { Config } from '../db/types';

export function syncVivoHabilitado(): boolean {
  // Requiere el cliente de Supabase configurado (claves VITE_*). Quién puede
  // usar el sync lo decide el plan (ver capacidades). VITE_SYNC_VIVO === '0'
  // es un apagado de emergencia global (por si hay que cortarlo para todos).
  return !!supa() && (import.meta.env.VITE_SYNC_VIVO as string | undefined) !== '0';
}

const TABLAS = ['barberos', 'servicios', 'cortes', 'turnos', 'bloqueos'] as const;
type Tabla = (typeof TABLAS)[number];
const esTablaSync = (t: string): t is Tabla => (TABLAS as readonly string[]).includes(t);
const tablaDe = (t: Tabla): Table<any, number> => db[t] as unknown as Table<any, number>;

/** Campos de config que se comparten entre dispositivos (no los del equipo). */
function configCompartida(c: Config): Record<string, unknown> {
  return {
    nombreBarberia: c.nombreBarberia,
    horario: c.horario,
    duracionTurnoDefault: c.duracionTurnoDefault,
    esDuenio: c.esDuenio,
    googleClientId: c.googleClientId,
    feedbackEmail: c.feedbackEmail,
  };
}

let ownerId = '';
let canal: any = null;
let drenaje: ReturnType<typeof setInterval> | null = null;

const lsGet = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const lsSet = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
};

/** Registro → fila de la tabla `datos` (sin el id autoincremental local). */
function filaDe(tabla: string, rec: any) {
  const { id: _omit, ...limpio } = rec;
  return {
    owner: ownerId,
    tabla,
    id: rec.uuid,
    data: limpio,
    updated_at: new Date(rec.updatedAt ?? Date.now()).toISOString(),
    deleted: false,
  };
}
function tombstone(tabla: string, uuid: string) {
  return { owner: ownerId, tabla, id: uuid, data: {}, updated_at: new Date().toISOString(), deleted: true };
}
function filaConfig(c: Config) {
  return {
    owner: ownerId,
    tabla: 'config',
    id: 'singleton',
    data: configCompartida(c),
    updated_at: new Date().toISOString(),
    deleted: false,
  };
}

/** Aplica una fila de la nube a Dexie (LWW). Se llama con aplicandoRemoto=true. */
async function aplicar(row: any): Promise<void> {
  if (row.tabla === 'config') {
    const actual = await obtenerConfig();
    if (actual?.id != null) await db.config.update(actual.id, { ...row.data });
    return;
  }
  if (!esTablaSync(row.tabla)) return;
  const tabla = tablaDe(row.tabla);
  const existente = await tabla.where('uuid').equals(row.id).first();
  if (row.deleted) {
    if (existente?.id != null) await tabla.delete(existente.id);
    return;
  }
  const entrante = row.data;
  if (!existente) {
    await tabla.add(entrante as never);
  } else if ((entrante.updatedAt ?? 0) >= (existente.updatedAt ?? 0)) {
    await tabla.update(existente.id as number, { ...entrante, id: existente.id } as never);
  }
}

async function conRemoto(fn: () => Promise<void>): Promise<void> {
  flags.aplicandoRemoto = true;
  try {
    await fn();
  } finally {
    flags.aplicandoRemoto = false;
  }
}

/** Trae cambios nuevos de la nube y los aplica. */
async function pull(cli: any): Promise<void> {
  const clave = `corte.sync.pull.${ownerId}`;
  const desde = lsGet(clave) || '1970-01-01T00:00:00Z';
  const { data, error } = await cli
    .from('datos')
    .select('*')
    .gt('updated_at', desde)
    .order('updated_at', { ascending: true });
  if (error || !data?.length) return;
  await conRemoto(async () => {
    for (const row of data) await aplicar(row);
  });
  lsSet(clave, data[data.length - 1].updated_at);
}

/** Dispositivo que se suma a una barbería que ya tiene datos: adopta la nube. */
async function adoptarDesdeNube(cli: any): Promise<void> {
  const { data } = await cli.from('datos').select('*');
  if (!data) return;
  await conRemoto(async () => {
    await db.transaction('rw', [db.barberos, db.servicios, db.cortes, db.turnos, db.bloqueos], async () => {
      await Promise.all(TABLAS.map((t) => tablaDe(t).clear()));
      for (const row of data) {
        if (row.deleted || !esTablaSync(row.tabla)) continue;
        const { id: _omit, ...limpio } = row.data;
        await tablaDe(row.tabla as Tabla).add(limpio);
      }
    });
    const cfg = data.find((r: any) => r.tabla === 'config' && !r.deleted);
    const actual = await obtenerConfig();
    if (cfg && actual?.id != null) await db.config.update(actual.id, { ...cfg.data });
    if (actual?.id != null) await db.config.update(actual.id, { onboardingCompletado: true });
  });
}

/** Primer dispositivo de la barbería: sube todo lo local a la nube. */
async function sembrarEnNube(cli: any): Promise<void> {
  const filas: any[] = [];
  for (const t of TABLAS) for (const rec of await tablaDe(t).toArray()) filas.push(filaDe(t, rec));
  const cfg = await obtenerConfig();
  if (cfg) filas.push(filaConfig(cfg));
  for (let i = 0; i < filas.length; i += 100) {
    await cli.from('datos').upsert(filas.slice(i, i + 100), { onConflict: 'owner,tabla,id' });
  }
}

/** Sube los pendientes acumulados por los hooks. */
async function drenar(cli: any): Promise<void> {
  if (!pendientes.size) return;
  const items = [...pendientes.values()];
  const filas: any[] = [];
  for (const p of items) {
    if (p.op === 'del') {
      filas.push(tombstone(p.tabla, p.uuid));
    } else if (p.tabla === 'config') {
      const cfg = await obtenerConfig();
      if (cfg) filas.push(filaConfig(cfg));
    } else if (esTablaSync(p.tabla)) {
      const rec = await tablaDe(p.tabla).where('uuid').equals(p.uuid).first();
      filas.push(rec ? filaDe(p.tabla, rec) : tombstone(p.tabla, p.uuid));
    }
  }
  const { error } = await cli.from('datos').upsert(filas, { onConflict: 'owner,tabla,id' });
  if (!error) for (const p of items) pendientes.delete(`${p.tabla}:${p.uuid}`);
}

/** Encola lo local cambiado desde el último push (cubre ediciones offline). */
async function encolarLocalReciente(): Promise<void> {
  const clave = `corte.sync.push.${ownerId}`;
  const desde = Number(lsGet(clave) || 0);
  for (const t of TABLAS) {
    for (const rec of await tablaDe(t).toArray()) {
      if ((rec.updatedAt ?? 0) > desde) encolarCambio(t, rec.uuid, 'put');
    }
  }
  lsSet(clave, String(Date.now()));
}

function suscribir(cli: any): void {
  if (canal) cli.removeChannel(canal);
  canal = cli
    .channel(`datos-${ownerId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'datos' }, async (payload: any) => {
      const row = payload.new;
      if (!row || row.owner !== ownerId) return;
      await conRemoto(() => aplicar(row));
    })
    .subscribe();
}

export interface ResultadoSync {
  ok: boolean;
  estado?: string;
  error?: string;
}

/** Arranca el sync para una barbería (código de licencia). */
export async function iniciarSync(codigo: string): Promise<ResultadoSync> {
  const cli = supa();
  if (!cli) return { ok: false, error: 'no_cloud' };

  const config = await obtenerConfig();
  const r = await fetch('/api/activar', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ codigo, barberia: config?.nombreBarberia }),
  });
  if (r.status === 501) return { ok: false, error: 'no_cloud' };
  const d = await r.json();
  if (!d.activada) return { ok: false, estado: d.estado, error: d.error };

  const { data: sesion, error } = await cli.auth.signInWithPassword({
    email: d.email,
    password: d.password,
  });
  if (error || !sesion?.user) return { ok: false, error: 'auth' };
  ownerId = sesion.user.id;

  // ¿Primer dispositivo (siembra) o se suma a una barbería existente (adopta)?
  const marca = `corte.sync.adoptado.${codigo}`;
  if (lsGet(marca) !== '1') {
    const { count } = await cli.from('datos').select('id', { count: 'exact', head: true });
    if ((count ?? 0) > 0) await adoptarDesdeNube(cli);
    else await sembrarEnNube(cli);
    lsSet(marca, '1');
  }

  flags.activo = true;
  await pull(cli);
  await encolarLocalReciente();
  suscribir(cli);
  if (drenaje) clearInterval(drenaje);
  drenaje = setInterval(() => drenar(cli).catch(() => {}), 1500);
  return { ok: true, estado: 'activa' };
}

export function detenerSync(): void {
  flags.activo = false;
  const cli = supa();
  if (canal && cli) cli.removeChannel(canal);
  canal = null;
  if (drenaje) clearInterval(drenaje);
  drenaje = null;
}
