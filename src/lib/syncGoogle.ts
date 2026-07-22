// Puente entre los turnos locales y Google Calendar. Todo es best-effort:
// si Google falla o no está conectado, el turno se guarda igual localmente.

import { db } from '../db/db';
import { actualizarTurno } from '../db/turnos';
import {
  clientIdEfectivo,
  googleConectado,
  crearEventoGoogle,
  actualizarEventoGoogle,
  borrarEventoGoogle,
} from './googleCalendar';
import type { Config, Turno } from '../db/types';

function clientIdActivo(config: Config): string | null {
  const id = clientIdEfectivo(config);
  return id && googleConectado() ? id : null;
}

/** Crea el evento en Google (si corresponde) y guarda el googleEventId. */
export async function syncCrearEvento(config: Config, turnoUuid: string): Promise<void> {
  const clientId = clientIdActivo(config);
  if (!clientId) return;
  const turno = await db.turnos.where('uuid').equals(turnoUuid).first();
  if (!turno || turno.googleEventId) return;
  try {
    const id = await crearEventoGoogle(clientId, turno, config.nombreBarberia);
    await actualizarTurno(turnoUuid, { googleEventId: id });
  } catch (e) {
    console.warn('Google Calendar: no se pudo crear el evento', e);
  }
}

/** Actualiza el evento en Google si el turno ya estaba sincronizado. */
export async function syncActualizarEvento(config: Config, turno: Turno): Promise<void> {
  const clientId = clientIdActivo(config);
  if (!clientId || !turno.googleEventId) return;
  try {
    await actualizarEventoGoogle(clientId, turno.googleEventId, turno, config.nombreBarberia);
  } catch (e) {
    console.warn('Google Calendar: no se pudo actualizar el evento', e);
  }
}

/** Borra el evento en Google (cancelación) y avisa al cliente. */
export async function syncBorrarEvento(config: Config, turno: Turno): Promise<void> {
  const clientId = clientIdActivo(config);
  if (!clientId || !turno.googleEventId) return;
  try {
    await borrarEventoGoogle(clientId, turno.googleEventId);
  } catch (e) {
    console.warn('Google Calendar: no se pudo borrar el evento', e);
  }
}
