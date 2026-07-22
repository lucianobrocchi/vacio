// Volcado y restauración de toda la barbería (para el respaldo en la nube).

import { db } from './db';
import type { Config } from './types';

export interface Volcado {
  v: number;
  barberos: unknown[];
  servicios: unknown[];
  cortes: unknown[];
  turnos: unknown[];
  bloqueos: unknown[];
  config: Partial<Config> | null;
}

/** Campos de config que NO viajan en el respaldo (son del dispositivo). */
function configParaExportar(config: Config | undefined): Partial<Config> | null {
  if (!config) return null;
  const { id: _id, licenciaCodigo: _lc, licenciaEstado: _le, ultimoRespaldoEn: _ur, ...resto } = config;
  return resto;
}

export async function exportarDatos(): Promise<Volcado> {
  const [barberos, servicios, cortes, turnos, bloqueos, config] = await Promise.all([
    db.barberos.toArray(),
    db.servicios.toArray(),
    db.cortes.toArray(),
    db.turnos.toArray(),
    db.bloqueos.toArray(),
    db.config.toCollection().first(),
  ]);
  return { v: 1, barberos, servicios, cortes, turnos, bloqueos, config: configParaExportar(config) };
}

/** Resumen liviano para que el panel admin vea el pulso de cada barbería. */
export async function resumenDatos(): Promise<Record<string, number>> {
  const [barberos, cortes, turnos] = await Promise.all([
    db.barberos.count(),
    db.cortes.count(),
    db.turnos.count(),
  ]);
  const ultimo = await db.cortes.orderBy('fecha').last();
  return { barberos, cortes, turnos, ultimoCorte: ultimo?.fecha ?? 0 };
}

/**
 * Restaura el volcado en la base local. Reemplaza los datos del negocio pero
 * conserva la licencia de ESTE dispositivo.
 */
export async function importarDatos(data: Volcado): Promise<void> {
  if (!data || data.v !== 1) throw new Error('Respaldo inválido');
  await db.transaction(
    'rw',
    [db.barberos, db.servicios, db.cortes, db.turnos, db.bloqueos, db.config],
    async () => {
      await Promise.all([
        db.barberos.clear(),
        db.servicios.clear(),
        db.cortes.clear(),
        db.turnos.clear(),
        db.bloqueos.clear(),
      ]);
      if (data.barberos?.length) await db.barberos.bulkAdd(data.barberos as never[]);
      if (data.servicios?.length) await db.servicios.bulkAdd(data.servicios as never[]);
      if (data.cortes?.length) await db.cortes.bulkAdd(data.cortes as never[]);
      if (data.turnos?.length) await db.turnos.bulkAdd(data.turnos as never[]);
      if (data.bloqueos?.length) await db.bloqueos.bulkAdd(data.bloqueos as never[]);

      // Config: actualiza los campos del negocio, preserva la licencia local.
      if (data.config) {
        const actual = await db.config.toCollection().first();
        if (actual?.id != null) {
          const { licenciaCodigo, licenciaEstado, ultimoRespaldoEn } = actual;
          await db.config.update(actual.id, {
            ...data.config,
            licenciaCodigo,
            licenciaEstado,
            ultimoRespaldoEn,
            onboardingCompletado: true,
          });
        }
      }
    },
  );
}
