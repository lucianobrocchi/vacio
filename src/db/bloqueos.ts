import { db } from './db';
import { uuid } from '../lib/uuid';
import type { Bloqueo } from './types';

export interface DatosBloqueo {
  dia: string;
  desde: string;
  hasta: string;
  motivo?: string;
  barberoUuid: string;
}

export async function crearBloqueo(datos: DatosBloqueo): Promise<string> {
  const nuevo: Bloqueo = { uuid: uuid(), ...datos, updatedAt: Date.now() };
  await db.bloqueos.add(nuevo);
  return nuevo.uuid;
}

export async function borrarBloqueo(bloqueoUuid: string): Promise<void> {
  await db.bloqueos.where('uuid').equals(bloqueoUuid).delete();
}

export async function bloqueosDelDia(dia: string, barberoUuid?: string): Promise<Bloqueo[]> {
  let bloqueos = await db.bloqueos.where('dia').equals(dia).toArray();
  if (barberoUuid) bloqueos = bloqueos.filter((b) => b.barberoUuid === barberoUuid);
  return bloqueos.sort((a, b) => a.desde.localeCompare(b.desde));
}
