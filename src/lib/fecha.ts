// Helpers de fecha y hora. Todo en hora local del dispositivo.

const MS_DIA = 24 * 60 * 60 * 1000;

/** Clave de día local "YYYY-MM-DD" para una fecha dada. */
export function claveDia(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** Date (00:00 local) a partir de una clave "YYYY-MM-DD". */
export function desdeClave(dia: string): Date {
  const [y, m, d] = dia.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Suma (o resta) días a una clave "YYYY-MM-DD". */
export function sumarDias(dia: string, dias: number): string {
  const d = desdeClave(dia);
  d.setDate(d.getDate() + dias);
  return claveDia(d);
}

/** Timestamp del comienzo del día (00:00:00.000). */
export function inicioDelDia(ts: number = Date.now()): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Timestamp del final del día (23:59:59.999). */
export function finDelDia(ts: number = Date.now()): number {
  const d = new Date(ts);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/** Rango [desde, hasta] de los últimos `dias` días, incluyendo hoy. */
export function rangoUltimosDias(dias: number): [number, number] {
  return [inicioDelDia(Date.now() - (dias - 1) * MS_DIA), finDelDia()];
}

/** "HH:mm" → minutos desde las 00:00. "09:30" → 570. */
export function horaAMin(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** Minutos desde las 00:00 → "HH:mm". 570 → "09:30". */
export function minAHora(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Timestamp exacto de un día + hora locales ("2026-07-14", "15:30"). */
export function timestampDe(dia: string, hora: string): number {
  const d = desdeClave(dia);
  d.setMinutes(horaAMin(hora));
  return d.getTime();
}

const FMT_HORA = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' });

const FMT_FECHA = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const FMT_FECHA_LARGA = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const FMT_DIA_CORTO = new Intl.DateTimeFormat('es-AR', { weekday: 'short' });

/** "14:35" a partir de un timestamp. */
export function formatHora(ts: number): string {
  return FMT_HORA.format(ts);
}

/** "02/06/2026" */
export function formatFecha(ts: number): string {
  return FMT_FECHA.format(ts);
}

/** "martes 2 de junio" (con mayúscula inicial), desde ts o clave de día. */
export function formatFechaLarga(fecha: number | string = Date.now()): string {
  const ts = typeof fecha === 'string' ? desdeClave(fecha).getTime() : fecha;
  const txt = FMT_FECHA_LARGA.format(ts);
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

/** "mar" / "sáb" para la tira de días. */
export function formatDiaCorto(dia: string): string {
  return FMT_DIA_CORTO.format(desdeClave(dia)).replace('.', '');
}

/** Nombres de los días para el editor de horario (índice JS: 0 = domingo). */
export const NOMBRES_DIAS = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

/** Rango [desde, hasta] en claves de día para un período. */
export function rangoPeriodo(periodo: 'hoy' | 'semana' | 'mes'): [string, string] {
  const hoy = claveDia();
  if (periodo === 'hoy') return [hoy, hoy];
  if (periodo === 'semana') {
    // Semana calendario: lunes a domingo.
    const d = new Date();
    const dif = (d.getDay() + 6) % 7; // días desde el lunes
    return [sumarDias(hoy, -dif), sumarDias(hoy, 6 - dif)];
  }
  // Mes calendario.
  const d = new Date();
  const primero = claveDia(new Date(d.getFullYear(), d.getMonth(), 1));
  const ultimo = claveDia(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  return [primero, ultimo];
}

/** El rango anterior equivalente (para comparar períodos). */
export function rangoAnterior(periodo: 'hoy' | 'semana' | 'mes'): [string, string] {
  const [desde] = rangoPeriodo(periodo);
  if (periodo === 'hoy') return [sumarDias(desde, -1), sumarDias(desde, -1)];
  if (periodo === 'semana') return [sumarDias(desde, -7), sumarDias(desde, -1)];
  const d = desdeClave(desde);
  const primero = claveDia(new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const ultimo = claveDia(new Date(d.getFullYear(), d.getMonth(), 0));
  return [primero, ultimo];
}
