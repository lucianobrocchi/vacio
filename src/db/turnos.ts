import { db } from './db';
import { uuid } from '../lib/uuid';
import { ficharCorte } from './cortes';
import { timestampDe } from '../lib/fecha';
import type { EstadoTurno, MedioPago, OrigenTurno, Turno } from './types';

export interface DatosTurno {
  dia: string;
  hora: string;
  duracionMin: number;
  barberoUuid: string;
  servicioUuid: string;
  servicioNombre: string;
  precio: number;
  clienteNombre: string;
  clienteTelefono?: string;
  clienteEmail?: string;
  origen: OrigenTurno;
  nota?: string;
}

export async function crearTurno(datos: DatosTurno): Promise<string> {
  const nuevo: Turno = {
    uuid: uuid(),
    ...datos,
    clienteNombre: datos.clienteNombre.trim(),
    // Los que agenda el barbero nacen confirmados; los del link, pendientes.
    estado: datos.origen === 'barbero' ? 'confirmado' : 'pendiente',
    creadoEn: Date.now(),
    updatedAt: Date.now(),
  };
  await db.turnos.add(nuevo);
  return nuevo.uuid;
}

export async function actualizarTurno(
  turnoUuid: string,
  cambios: Partial<Omit<Turno, 'id' | 'uuid'>>,
): Promise<void> {
  await db.turnos
    .where('uuid')
    .equals(turnoUuid)
    .modify({ ...cambios, updatedAt: Date.now() });
}

export async function cambiarEstadoTurno(turnoUuid: string, estado: EstadoTurno): Promise<void> {
  await actualizarTurno(turnoUuid, { estado });
}

/** Marca el turno como hecho y lo ficha como corte (un solo toque). */
export async function marcarTurnoHecho(turno: Turno, medioPago: MedioPago): Promise<void> {
  await cambiarEstadoTurno(turno.uuid, 'hecho');
  await ficharCorte({
    fecha: timestampDe(turno.dia, turno.hora),
    barberoUuid: turno.barberoUuid,
    servicioUuid: turno.servicioUuid,
    servicioNombre: turno.servicioNombre,
    precio: turno.precio,
    medioPago,
    clienteNombre: turno.clienteNombre,
    turnoUuid: turno.uuid,
  });
}

export async function borrarTurno(turnoUuid: string): Promise<void> {
  await db.turnos.where('uuid').equals(turnoUuid).delete();
}

/** Turnos de un día, ordenados por hora. Opcionalmente de un barbero. */
export async function turnosDelDia(dia: string, barberoUuid?: string): Promise<Turno[]> {
  let turnos = await db.turnos.where('dia').equals(dia).toArray();
  if (barberoUuid) turnos = turnos.filter((t) => t.barberoUuid === barberoUuid);
  return turnos.sort((a, b) => a.hora.localeCompare(b.hora));
}

/** Turnos entre dos días (para el panel del dueño y próximos turnos). */
export async function turnosEntre(desde: string, hasta: string): Promise<Turno[]> {
  const turnos = await db.turnos.where('dia').between(desde, hasta, true, true).toArray();
  return turnos.sort((a, b) => (a.dia + a.hora).localeCompare(b.dia + b.hora));
}

/** Clientes conocidos (de turnos anteriores), para autocompletar. */
export async function clientesConocidos(): Promise<
  { nombre: string; telefono?: string; email?: string }[]
> {
  const turnos = await db.turnos.orderBy('id').reverse().limit(400).toArray();
  const vistos = new Map<string, { nombre: string; telefono?: string; email?: string }>();
  for (const t of turnos) {
    const clave = t.clienteNombre.toLowerCase();
    if (!vistos.has(clave)) {
      vistos.set(clave, {
        nombre: t.clienteNombre,
        telefono: t.clienteTelefono,
        email: t.clienteEmail,
      });
    }
  }
  return [...vistos.values()];
}
