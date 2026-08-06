import { db } from './db';
import { uuid } from '../lib/uuid';
import type { Barbero } from './types';

/** Comisión por defecto de un barbero (% de lo que factura). */
export const COMISION_DEFAULT = 50;

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
}): Promise<string> {
  const orden = (await db.barberos.count()) + 1;
  const nuevo: Barbero = {
    uuid: uuid(),
    nombre: datos.nombre.trim(),
    emoji: datos.emoji,
    comision: datos.comision ?? COMISION_DEFAULT,
    telefono: datos.telefono,
    orden,
    activo: 1,
    updatedAt: Date.now(),
  };
  await db.barberos.add(nuevo);
  return nuevo.uuid;
}

export async function actualizarBarbero(
  barberoUuid: string,
  cambios: Partial<Pick<Barbero, 'nombre' | 'emoji' | 'activo' | 'comision' | 'telefono'>>,
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
