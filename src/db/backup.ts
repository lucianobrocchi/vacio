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
  /** Desde v2: stock y ventas de productos. */
  productos?: unknown[];
  ventas?: unknown[];
  config: Partial<Config> | null;
}

/**
 * Campos de config que NO viajan en el respaldo (son de cada dispositivo).
 * Ojo con `barberoActivoUuid` y `esDuenio`: si viajaran, el barbero que baja
 * el respaldo entraría como el dueño y vería los números de todo el local.
 */
function configParaExportar(config: Config | undefined): Partial<Config> | null {
  if (!config) return null;
  const {
    id: _id,
    licenciaCodigo: _lc,
    licenciaEstado: _le,
    licenciaPlan: _lp,
    ultimoRespaldoEn: _ur,
    barberoActivoUuid: _ba,
    esDuenio: _ed,
    ...resto
  } = config;
  return resto;
}

export async function exportarDatos(): Promise<Volcado> {
  const [barberos, servicios, cortes, turnos, bloqueos, productos, ventas, config] =
    await Promise.all([
      db.barberos.toArray(),
      db.servicios.toArray(),
      db.cortes.toArray(),
      db.turnos.toArray(),
      db.bloqueos.toArray(),
      db.productos.toArray(),
      db.ventas.toArray(),
      db.config.toCollection().first(),
    ]);
  return {
    v: 2,
    barberos,
    servicios,
    cortes,
    turnos,
    bloqueos,
    productos,
    ventas,
    config: configParaExportar(config),
  };
}

/** Resumen liviano para que el panel admin vea el pulso de cada barbería. */
export async function resumenDatos(): Promise<Record<string, number>> {
  const [barberos, cortes, turnos, ventas] = await Promise.all([
    db.barberos.count(),
    db.cortes.count(),
    db.turnos.count(),
    db.ventas.count(),
  ]);
  const ultimo = await db.cortes.orderBy('fecha').last();
  return { barberos, cortes, turnos, ventas, ultimoCorte: ultimo?.fecha ?? 0 };
}

/**
 * Restaura el volcado en la base local. Reemplaza los datos del negocio pero
 * conserva la licencia de ESTE dispositivo.
 */
export async function importarDatos(data: Volcado): Promise<void> {
  // v1 = respaldo viejo (sin productos ni ventas); v2 = con stock.
  if (!data || (data.v !== 1 && data.v !== 2)) throw new Error('Respaldo inválido');
  // Un respaldo sin barberos no es una barbería: no lo damos por bueno (si no,
  // el equipo que se suma queda "adentro" pero sin nadie a quien elegir).
  if (!data.barberos?.length) throw new Error('Respaldo vacío');
  await db.transaction(
    'rw',
    [db.barberos, db.servicios, db.cortes, db.turnos, db.bloqueos, db.productos, db.ventas, db.config],
    async () => {
      await Promise.all([
        db.barberos.clear(),
        db.servicios.clear(),
        db.cortes.clear(),
        db.turnos.clear(),
        db.bloqueos.clear(),
        db.productos.clear(),
        db.ventas.clear(),
      ]);
      if (data.barberos?.length) await db.barberos.bulkAdd(data.barberos as never[]);
      if (data.servicios?.length) await db.servicios.bulkAdd(data.servicios as never[]);
      if (data.cortes?.length) await db.cortes.bulkAdd(data.cortes as never[]);
      if (data.turnos?.length) await db.turnos.bulkAdd(data.turnos as never[]);
      if (data.bloqueos?.length) await db.bloqueos.bulkAdd(data.bloqueos as never[]);
      if (data.productos?.length) await db.productos.bulkAdd(data.productos as never[]);
      if (data.ventas?.length) await db.ventas.bulkAdd(data.ventas as never[]);

      // Config: actualiza los campos del negocio, pero conserva lo que es de
      // ESTE teléfono: su licencia y, sobre todo, quién inició sesión acá.
      if (data.config) {
        const actual = await db.config.toCollection().first();
        if (actual?.id != null) {
          const {
            licenciaCodigo,
            licenciaEstado,
            licenciaPlan,
            ultimoRespaldoEn,
            barberoActivoUuid,
            esDuenio,
          } = actual;
          await db.config.update(actual.id, {
            ...data.config,
            licenciaCodigo,
            licenciaEstado,
            licenciaPlan,
            ultimoRespaldoEn,
            barberoActivoUuid,
            esDuenio,
            onboardingCompletado: true,
          });
        }
      }
    },
  );
}
