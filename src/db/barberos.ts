import { db } from './db';
import { uuid } from '../lib/uuid';
import type { Barbero } from './types';

/** Comisión por defecto de un barbero (% de lo que factura). */
export const COMISION_DEFAULT = 50;

/** PIN de 4 dígitos para que el barbero entre desde su teléfono. */
export function generarPin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/** Normaliza barberos viejos que no tengan `comision` cargada. */
function conComision(b: Barbero): Barbero {
  return { ...b, comision: b.comision ?? COMISION_DEFAULT };
}

export async function listarBarberos(incluirInactivos = false): Promise<Barbero[]> {
  const todos = (await db.barberos.orderBy('orden').toArray()).map(conComision);
  return incluirInactivos ? todos : todos.filter((b) => b.activo === 1);
}

export async function crearBarbero(datos: {
  nombre: string;
  emoji?: string;
  comision?: number;
  telefono?: string;
  pin?: string;
  esDuenio?: boolean;
}): Promise<string> {
  const orden = (await db.barberos.count()) + 1;
  const nuevo: Barbero = {
    uuid: uuid(),
    nombre: datos.nombre.trim(),
    emoji: datos.emoji,
    comision: datos.comision ?? COMISION_DEFAULT,
    telefono: datos.telefono,
    pin: datos.pin ?? generarPin(),
    esDuenio: datos.esDuenio ?? false,
    orden,
    activo: 1,
    updatedAt: Date.now(),
  };
  await db.barberos.add(nuevo);
  return nuevo.uuid;
}

export async function actualizarBarbero(
  barberoUuid: string,
  cambios: Partial<
    Pick<Barbero, 'nombre' | 'emoji' | 'activo' | 'comision' | 'telefono' | 'pin' | 'esDuenio'>
  >,
): Promise<void> {
  await db.barberos
    .where('uuid')
    .equals(barberoUuid)
    .modify({ ...cambios, updatedAt: Date.now() });
}

/** Baja lógica: conserva sus cortes e historial. */
export async function desactivarBarbero(barberoUuid: string): Promise<void> {
  await actualizarBarbero(barberoUuid, { activo: 0 });
}

export async function obtenerBarbero(barberoUuid: string): Promise<Barbero | undefined> {
  return db.barberos.where('uuid').equals(barberoUuid).first();
}

/**
 * Valida el PIN de un barbero para entrar desde un teléfono.
 * Si todavía no tiene PIN cargado, lo dejamos pasar (instalaciones viejas).
 */
export function pinCorrecto(barbero: Barbero, pin: string): boolean {
  if (!barbero.pin) return true;
  return barbero.pin === pin.trim();
}
