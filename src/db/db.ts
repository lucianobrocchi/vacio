import Dexie, { type Table } from 'dexie';
import type { Barbero, Bloqueo, Config, Corte, Servicio, Turno } from './types';

/**
 * Base de datos local de Corte (IndexedDB vía Dexie).
 * Local-first: no hay backend todavía, todo se guarda en el dispositivo.
 */
export class CorteDB extends Dexie {
  barberos!: Table<Barbero, number>;
  servicios!: Table<Servicio, number>;
  cortes!: Table<Corte, number>;
  turnos!: Table<Turno, number>;
  bloqueos!: Table<Bloqueo, number>;
  config!: Table<Config, number>;

  constructor() {
    super('corte');

    this.version(1).stores({
      barberos: '++id, &uuid, orden',
      servicios: '++id, &uuid, orden',
      cortes: '++id, &uuid, fecha, dia, barberoUuid',
      turnos: '++id, &uuid, dia, barberoUuid, estado',
      bloqueos: '++id, &uuid, dia, barberoUuid',
      config: '++id',
    });
  }
}

export const db = new CorteDB();
