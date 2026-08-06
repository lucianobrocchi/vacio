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
  /** Su WhatsApp: ahí le llegan los pedidos de productos de su link. */
  telefono?: string;
  /** PIN de 4 dígitos para entrar desde su teléfono. Lo maneja el dueño. */
  pin?: string;
  /** Si es dueño: ve la pestaña Barbería con los números de todo el local. */
  esDuenio?: boolean;
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

/**
 * Un producto para vender (pomada, shampoo, gorra). Cada barbero puede tener
 * su propio stock: `barberoUuid` vacío = producto del local (lo vende
 * cualquiera); con uuid = stock de ese barbero.
 */
export interface Producto {
  id?: number;
  uuid: string;
  nombre: string;
  /** Precio de venta al cliente. */
  precio: number;
  /** Lo que costó comprarlo (para saber el margen real). */
  costo: number;
  /** Unidades disponibles. */
  stock: number;
  /** % que se lleva el barbero por vender este producto (0–100). */
  comision: number;
  /** Dueño del stock: '' = del local, o el uuid del barbero. */
  barberoUuid: string;
  emoji?: string;
  orden: number;
  activo: 0 | 1;
  updatedAt: number;
}

/** Quién originó la venta: el barbero en el local o el link público. */
export type OrigenVenta = 'barbero' | 'link';

/** Una venta de producto (ya cobrada). Descuenta stock. */
export interface Venta {
  id?: number;
  uuid: string;
  fecha: number;
  /** Clave del día local "YYYY-MM-DD". */
  dia: string;
  productoUuid: string;
  /** Snapshots: si después cambiás el producto, el historial no se toca. */
  productoNombre: string;
  /** Precio unitario cobrado. */
  precio: number;
  /** Costo unitario al momento de vender. */
  costo: number;
  cantidad: number;
  barberoUuid: string;
  medioPago: MedioPago;
  /** % de comisión del barbero al momento de vender. */
  comision: number;
  clienteNombre?: string;
  origen: OrigenVenta;
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
  /** Código de licencia/membresía activado en este dispositivo. */
  licenciaCodigo?: string;
  /** Último estado conocido de la licencia (activa | suspendida | vencida). */
  licenciaEstado?: string;
  /** Plan de la membresía (trial | pro | full). Define qué funciones tiene. */
  licenciaPlan?: string;
  /** A qué barbería (código) pertenecen los datos de este teléfono. */
  datosDeCodigo?: string;
  /** Timestamp del último respaldo en la nube. */
  ultimoRespaldoEn?: number;
  onboardingCompletado: boolean;
}
