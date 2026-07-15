import { db } from './db';
import { uuid } from '../lib/uuid';
import type { Servicio } from './types';

export async function listarServicios(incluirInactivos = false): Promise<Servicio[]> {
  const todos = await db.servicios.orderBy('orden').toArray();
  return incluirInactivos ? todos : todos.filter((s) => s.activo === 1);
}

export async function crearServicio(datos: {
  nombre: string;
  precio: number;
  duracionMin: number;
  emoji?: string;
}): Promise<string> {
  const orden = (await db.servicios.count()) + 1;
  const nuevo: Servicio = {
    uuid: uuid(),
    nombre: datos.nombre.trim(),
    precio: datos.precio,
    duracionMin: datos.duracionMin,
    emoji: datos.emoji,
    orden,
    activo: 1,
    updatedAt: Date.now(),
  };
  await db.servicios.add(nuevo);
  return nuevo.uuid;
}

export async function actualizarServicio(
  servicioUuid: string,
  cambios: Partial<Pick<Servicio, 'nombre' | 'precio' | 'duracionMin' | 'emoji' | 'activo'>>,
): Promise<void> {
  await db.servicios
    .where('uuid')
    .equals(servicioUuid)
    .modify({ ...cambios, updatedAt: Date.now() });
}

/** Baja lógica: los cortes viejos guardan nombre y precio como snapshot. */
export async function desactivarServicio(servicioUuid: string): Promise<void> {
  await actualizarServicio(servicioUuid, { activo: 0 });
}
