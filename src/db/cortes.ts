import { db } from './db';
import { uuid } from '../lib/uuid';
import { claveDia } from '../lib/fecha';
import type { Corte, MedioPago } from './types';

export interface DatosCorte {
  fecha: number;
  barberoUuid: string;
  servicioUuid: string;
  servicioNombre: string;
  precio: number;
  medioPago: MedioPago;
  clienteNombre?: string;
  nota?: string;
  turnoUuid?: string;
}

export async function ficharCorte(datos: DatosCorte): Promise<string> {
  const nuevo: Corte = {
    uuid: uuid(),
    ...datos,
    dia: claveDia(new Date(datos.fecha)),
    updatedAt: Date.now(),
  };
  await db.cortes.add(nuevo);
  return nuevo.uuid;
}

export async function actualizarCorte(
  corteUuid: string,
  cambios: Partial<Omit<Corte, 'id' | 'uuid'>>,
): Promise<void> {
  if (cambios.fecha != null) cambios.dia = claveDia(new Date(cambios.fecha));
  await db.cortes
    .where('uuid')
    .equals(corteUuid)
    .modify({ ...cambios, updatedAt: Date.now() });
}

export async function borrarCorte(corteUuid: string): Promise<void> {
  await db.cortes.where('uuid').equals(corteUuid).delete();
}

/** Cortes de un día puntual, opcionalmente de un solo barbero. */
export async function cortesDelDia(dia: string, barberoUuid?: string): Promise<Corte[]> {
  let cortes = await db.cortes.where('dia').equals(dia).toArray();
  if (barberoUuid) cortes = cortes.filter((c) => c.barberoUuid === barberoUuid);
  return cortes.sort((a, b) => b.fecha - a.fecha);
}

/** Cortes en un rango de días ["YYYY-MM-DD", "YYYY-MM-DD"], ambos incluidos. */
export async function cortesEntre(
  desde: string,
  hasta: string,
  barberoUuid?: string,
): Promise<Corte[]> {
  let cortes = await db.cortes.where('dia').between(desde, hasta, true, true).toArray();
  if (barberoUuid) cortes = cortes.filter((c) => c.barberoUuid === barberoUuid);
  return cortes;
}
