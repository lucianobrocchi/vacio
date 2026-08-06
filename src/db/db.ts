import Dexie, { type Table } from 'dexie';
import type { Barbero, Bloqueo, Config, Corte, Producto, Servicio, Turno, Venta } from './types';
import { encolarCambio } from '../lib/syncCola';

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
  productos!: Table<Producto, number>;
  ventas!: Table<Venta, number>;
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

    // v2: stock de productos y ventas (cada barbero puede tener el suyo).
    this.version(2).stores({
      productos: '++id, &uuid, orden, barberoUuid',
      ventas: '++id, &uuid, fecha, dia, barberoUuid, productoUuid',
    });
  }
}

export const db = new CorteDB();

// Hooks de sync: cada cambio local se encola para subir a la nube (solo si el
// sync en vivo está activo; si no, no hacen nada). Ver lib/syncCola + lib/sync.
const TABLAS_SYNC = [
  'barberos',
  'servicios',
  'cortes',
  'turnos',
  'bloqueos',
  'productos',
  'ventas',
] as const;
for (const t of TABLAS_SYNC) {
  db[t].hook('creating', (_pk, obj) => {
    encolarCambio(t, (obj as { uuid?: string }).uuid, 'put');
  });
  db[t].hook('updating', (_mods, _pk, obj) => {
    encolarCambio(t, (obj as { uuid?: string }).uuid, 'put');
  });
  db[t].hook('deleting', (_pk, obj) => {
    encolarCambio(t, (obj as { uuid?: string }).uuid, 'del');
  });
}
db.config.hook('creating', () => encolarCambio('config', 'singleton', 'put'));
db.config.hook('updating', () => encolarCambio('config', 'singleton', 'put'));
