// Tipos del modelo de datos de Corte.
// Las tablas sincronizables llevan `uuid` + `updatedAt` (listas para un
// backend con sync last-write-wins en la Fase 2).

export type MedioPago = 'efectivo' | 'transferencia';

export type EstadoTurno = 'pendiente' | 'confirmado' | 'hecho' | 'cancelado';

/** Quién creó el turno: el barbero desde la agenda o el cliente desde el link. */
export type OrigenTurno = 'barbero' | 'cliente';

export interface Barbero {
  id?: number;
  uuid: string;
  nombre: string;
  emoji?: string;
  /** Comisión del barbero, en % de lo que factura (0–100). Default 50. */
  comision: number;
  orden: number;
  activo: 0 | 1;
  updatedAt: number;
}

export interface Servicio {
  id?: number;
  uuid: string;
  nombre: string;
  precio: number;
  duracionMin: number;
  emoji?: string;
  orden: number;
  activo: 0 | 1;
  updatedAt: number;
}

/** Un corte fichado (hecho y cobrado). El núcleo de la app. */
export interface Corte {
  id?: number;
  uuid: string;
  /** Timestamp exacto del corte (fecha + hora). */
  fecha: number;
  /** Clave del día local "YYYY-MM-DD", para agrupar y consultar rápido. */
  dia: string;
  barberoUuid: string;
  servicioUuid: string;
  /** Snapshots: si después cambiás el servicio, el historial no se toca. */
  servicioNombre: string;
  precio: number;
  medioPago: MedioPago;
  clienteNombre?: string;
  nota?: string;
  /** Si vino de un turno agendado, referencia al turno. */
  turnoUuid?: string;
  updatedAt: number;
}

/** Un turno agendado (a futuro). Al hacerse, se ficha como Corte. */
export interface Turno {
  id?: number;
  uuid: string;
  /** Día local "YYYY-MM-DD". */
  dia: string;
  /** Hora de inicio "HH:mm". */
  hora: string;
  duracionMin: number;
  barberoUuid: string;
  servicioUuid: string;
  servicioNombre: string;
  precio: number;
  clienteNombre: string;
  clienteTelefono?: string;
  clienteEmail?: string;
  estado: EstadoTurno;
  origen: OrigenTurno;
  nota?: string;
  /** ID del evento en Google Calendar, si se sincronizó. */
  googleEventId?: string;
  creadoEn: number;
  updatedAt: number;
}

/** Bloqueo de horario: "de tal hora a tal hora no atiendo" (cursos, trámites). */
export interface Bloqueo {
  id?: number;
  uuid: string;
  dia: string;
  desde: string;
  hasta: string;
  motivo?: string;
  barberoUuid: string;
  updatedAt: number;
}

/** Horario de atención de un día de la semana. */
export interface HorarioDia {
  cerrado: boolean;
  abre: string;
  cierra: string;
}

export interface Config {
  id?: number;
  nombreBarberia: string;
  /** Barbero que usa este teléfono (el "yo" de Fichar, Agenda y Stats). */
  barberoActivoUuid: string;
  /** Habilita la pestaña Barbería (panel del dueño). */
  esDuenio: boolean;
  /** Horario semanal, indexado por día JS: 0 = domingo … 6 = sábado. */
  horario: HorarioDia[];
  /** Paso de la grilla de turnos, en minutos. */
  duracionTurnoDefault: number;
  /** OAuth Client ID de Google (para sincronizar con Google Calendar). */
  googleClientId?: string;
  /** Email donde recibir el feedback (fallback si no hay webhook). */
  feedbackEmail?: string;
  onboardingCompletado: boolean;
}
