import { db } from './db';
import type { Config, HorarioDia } from './types';

/** Horario típico de barbería: martes a sábado 9 a 20, domingo y lunes cerrado. */
export function horarioDefault(): HorarioDia[] {
  const abierto: HorarioDia = { cerrado: false, abre: '09:00', cierra: '20:00' };
  const cerrado: HorarioDia = { cerrado: true, abre: '09:00', cierra: '20:00' };
  // Índice JS: 0 = domingo, 1 = lunes, … 6 = sábado.
  return [cerrado, cerrado, abierto, abierto, abierto, abierto, abierto];
}

const CONFIG_INICIAL: Config = {
  nombreBarberia: '',
  barberoActivoUuid: '',
  esDuenio: true,
  horario: horarioDefault(),
  duracionTurnoDefault: 30,
  onboardingCompletado: false,
};

/** Garantiza que exista la fila de config (se llama al arrancar la app). */
export async function seedConfig(): Promise<void> {
  const existente = await db.config.toCollection().first();
  if (!existente) await db.config.add({ ...CONFIG_INICIAL });
}

export async function obtenerConfig(): Promise<Config | undefined> {
  return db.config.toCollection().first();
}

export async function actualizarConfig(cambios: Partial<Config>): Promise<void> {
  const actual = await db.config.toCollection().first();
  if (actual?.id != null) await db.config.update(actual.id, cambios);
}
