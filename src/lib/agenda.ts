// Lógica pura de la agenda: slots libres, solapes y ocupación del día.

import { horaAMin, minAHora } from './fecha';
import type { Bloqueo, HorarioDia, Turno } from '../db/types';

/** ¿Se pisan los rangos [aDesde, aHasta) y [bDesde, bHasta)? (en minutos) */
export function haySolape(aDesde: number, aHasta: number, bDesde: number, bHasta: number): boolean {
  return aDesde < bHasta && bDesde < aHasta;
}

export interface Slot {
  hora: string;
  min: number;
  /** libre | ocupado (turno) | bloqueado | pasado (hoy, ya fue) */
  estado: 'libre' | 'ocupado' | 'bloqueado' | 'pasado';
}

export interface ParamsSlots {
  /** Horario del día de la semana correspondiente. */
  horario: HorarioDia;
  /** Turnos del día del barbero (los cancelados no ocupan lugar). */
  turnos: Turno[];
  bloqueos: Bloqueo[];
  /** Duración del servicio a agendar, en minutos. */
  duracionMin: number;
  /** Paso de la grilla en minutos (duracionTurnoDefault). */
  paso: number;
  /** Minutos "ahora" si el día es hoy (para marcar horas pasadas); null si no. */
  ahoraMin: number | null;
}

/**
 * Grilla de slots del día para agendar un servicio de `duracionMin`.
 * Un slot está libre si el servicio entero entra sin pisar turnos ni bloqueos
 * y termina antes del cierre.
 */
export function calcularSlots(params: ParamsSlots): Slot[] {
  const { horario, turnos, bloqueos, duracionMin, paso, ahoraMin } = params;
  if (horario.cerrado) return [];

  const abre = horaAMin(horario.abre);
  const cierra = horaAMin(horario.cierra);

  const ocupados = turnos
    .filter((t) => t.estado !== 'cancelado')
    .map((t) => {
      const desde = horaAMin(t.hora);
      return [desde, desde + t.duracionMin] as const;
    });
  const bloqueados = bloqueos.map((b) => [horaAMin(b.desde), horaAMin(b.hasta)] as const);

  const slots: Slot[] = [];
  for (let min = abre; min + duracionMin <= cierra; min += paso) {
    const hasta = min + duracionMin;
    let estado: Slot['estado'] = 'libre';
    if (ahoraMin != null && min < ahoraMin) estado = 'pasado';
    else if (bloqueados.some(([d, h]) => haySolape(min, hasta, d, h))) estado = 'bloqueado';
    else if (ocupados.some(([d, h]) => haySolape(min, hasta, d, h))) estado = 'ocupado';
    slots.push({ hora: minAHora(min), min, estado });
  }
  return slots;
}

/** Solo los slots donde se puede agendar. */
export function slotsLibres(params: ParamsSlots): Slot[] {
  return calcularSlots(params).filter((s) => s.estado === 'libre');
}

/**
 * ¿Puede agendarse un turno en `dia hora` sin pisar nada?
 * Para validar al guardar (por si el estado cambió mientras elegía).
 */
export function horaDisponible(
  hora: string,
  duracionMin: number,
  turnos: Turno[],
  bloqueos: Bloqueo[],
  ignorarTurnoUuid?: string,
): boolean {
  const desde = horaAMin(hora);
  const hasta = desde + duracionMin;
  const pisaTurno = turnos.some((t) => {
    if (t.estado === 'cancelado') return false;
    if (ignorarTurnoUuid && t.uuid === ignorarTurnoUuid) return false;
    const tDesde = horaAMin(t.hora);
    return haySolape(desde, hasta, tDesde, tDesde + t.duracionMin);
  });
  if (pisaTurno) return false;
  return !bloqueos.some((b) => haySolape(desde, hasta, horaAMin(b.desde), horaAMin(b.hasta)));
}
