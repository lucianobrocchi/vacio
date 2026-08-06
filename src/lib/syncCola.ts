// Cola en memoria + banderas del sync. Vive aparte (sin dependencias) para
// que los hooks de Dexie (en db.ts) y el motor (sync.ts) la compartan sin
// ciclos de importación.

export interface Pendiente {
  tabla: string;
  uuid: string;
  op: 'put' | 'del';
}

export const flags = {
  /** El sync en vivo está activo. */
  activo: false,
  /** Estamos aplicando cambios que vienen de la nube (no re-encolar). */
  aplicandoRemoto: false,
};

/** clave `${tabla}:${uuid}` → último cambio pendiente de subir. */
export const pendientes = new Map<string, Pendiente>();

/** Lo llaman los hooks de Dexie ante cada cambio local. */
export function encolarCambio(tabla: string, uuid: string | undefined, op: 'put' | 'del'): void {
  if (!flags.activo || flags.aplicandoRemoto || !uuid) return;
  pendientes.set(`${tabla}:${uuid}`, { tabla, uuid, op });
}
