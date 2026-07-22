// Cartera de clientes: se construye sola a partir de los cortes fichados y
// los turnos (no hay que "cargar clientes"). Calcula frecuencia de visita,
// última visita, gastado y estado (frecuente / en riesgo / nuevo).

import { db } from '../db/db';
import { claveDia, desdeClave } from './fecha';
import type { Turno } from '../db/types';

export type EstadoCliente = 'frecuente' | 'enRiesgo' | 'nuevo' | 'normal';

export interface Visita {
  dia: string;
  servicioNombre: string;
  precio: number;
}

export interface Cliente {
  /** Clave interna (nombre normalizado). */
  clave: string;
  nombre: string;
  telefono?: string;
  email?: string;
  /** Días distintos con visita, ordenados ascendente. */
  dias: string[];
  visitas: number;
  primera: string;
  ultima: string;
  /** Días desde la última visita. */
  haceDias: number;
  /** Cada cuántos días viene (promedio); null si tiene una sola visita. */
  frecuenciaDias: number | null;
  gastado: number;
  /** Próximo turno agendado (pendiente/confirmado), si tiene. */
  proximoTurno?: Turno;
  /** Últimas visitas con detalle (máx. 20, desc). */
  historial: Visita[];
  estado: EstadoCliente;
}

function normalizar(nombre: string): string {
  return nombre.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function diasEntre(a: string, b: string): number {
  return Math.round((desdeClave(b).getTime() - desdeClave(a).getTime()) / 86400000);
}

/**
 * Construye la cartera. Si `barberoUuid` viene, solo con la actividad de ese
 * barbero (para ver "los clientes de Tomi").
 */
export async function cargarCartera(barberoUuid?: string): Promise<Cliente[]> {
  let cortes = await db.cortes.toArray();
  let turnos = await db.turnos.toArray();
  if (barberoUuid) {
    cortes = cortes.filter((c) => c.barberoUuid === barberoUuid);
    turnos = turnos.filter((t) => t.barberoUuid === barberoUuid);
  }

  const hoy = claveDia();
  const mapa = new Map<
    string,
    {
      nombre: string;
      telefono?: string;
      email?: string;
      dias: Set<string>;
      gastado: number;
      historial: Visita[];
      proximoTurno?: Turno;
    }
  >();

  const entrada = (nombre: string) => {
    const clave = normalizar(nombre);
    let e = mapa.get(clave);
    if (!e) {
      e = { nombre: nombre.trim(), dias: new Set(), gastado: 0, historial: [] };
      mapa.set(clave, e);
    }
    return e;
  };

  for (const c of cortes) {
    if (!c.clienteNombre?.trim()) continue;
    const e = entrada(c.clienteNombre);
    e.dias.add(c.dia);
    e.gastado += c.precio;
    e.historial.push({ dia: c.dia, servicioNombre: c.servicioNombre, precio: c.precio });
  }

  for (const t of turnos) {
    if (!t.clienteNombre?.trim()) continue;
    const e = entrada(t.clienteNombre);
    // Datos de contacto: los turnos son la fuente (los cortes no los llevan).
    if (t.clienteTelefono && !e.telefono) e.telefono = t.clienteTelefono;
    if (t.clienteEmail && !e.email) e.email = t.clienteEmail;
    if (t.estado === 'hecho') e.dias.add(t.dia);
    if (
      (t.estado === 'pendiente' || t.estado === 'confirmado') &&
      t.dia >= hoy &&
      (!e.proximoTurno || t.dia + t.hora < e.proximoTurno.dia + e.proximoTurno.hora)
    ) {
      e.proximoTurno = t;
    }
  }

  const clientes: Cliente[] = [];
  for (const [clave, e] of mapa) {
    if (e.dias.size === 0 && !e.proximoTurno) continue;
    const dias = [...e.dias].sort();
    // Si solo tiene turno futuro (nunca vino), lo mostramos igual como "nuevo".
    const ultima = dias[dias.length - 1] ?? hoy;
    const primera = dias[0] ?? hoy;
    const haceDias = dias.length ? Math.max(diasEntre(ultima, hoy), 0) : 0;

    let frecuenciaDias: number | null = null;
    if (dias.length >= 2) {
      let suma = 0;
      for (let i = 1; i < dias.length; i++) suma += diasEntre(dias[i - 1], dias[i]);
      frecuenciaDias = Math.round(suma / (dias.length - 1));
    }

    let estado: EstadoCliente = 'normal';
    if (dias.length <= 1 && haceDias <= 30) estado = 'nuevo';
    else if (
      !e.proximoTurno &&
      dias.length >= 2 &&
      haceDias > Math.max((frecuenciaDias ?? 30) * 1.8, 30)
    )
      estado = 'enRiesgo';
    else if (frecuenciaDias != null && frecuenciaDias <= 35 && dias.length >= 3)
      estado = 'frecuente';

    clientes.push({
      clave,
      nombre: e.nombre,
      telefono: e.telefono,
      email: e.email,
      dias,
      visitas: dias.length,
      primera,
      ultima,
      haceDias,
      frecuenciaDias,
      gastado: e.gastado,
      proximoTurno: e.proximoTurno,
      historial: e.historial.sort((a, b) => b.dia.localeCompare(a.dia)).slice(0, 20),
      estado,
    });
  }

  // Los más recientes primero.
  return clientes.sort((a, b) => b.ultima.localeCompare(a.ultima));
}
