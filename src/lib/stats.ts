// Agregados para el dashboard: todo trabaja sobre listas de cortes ya
// filtradas por período/barbero (lógica pura, fácil de testear).

import { claveDia, desdeClave, sumarDias } from './fecha';
import type { Corte } from '../db/types';

export interface Totales {
  cortes: number;
  facturado: number;
  promedio: number;
  efectivo: number;
  transferencia: number;
}

export function totales(cortes: Corte[]): Totales {
  const facturado = cortes.reduce((acc, c) => acc + c.precio, 0);
  const efectivo = cortes
    .filter((c) => c.medioPago === 'efectivo')
    .reduce((acc, c) => acc + c.precio, 0);
  return {
    cortes: cortes.length,
    facturado,
    promedio: cortes.length ? facturado / cortes.length : 0,
    efectivo,
    transferencia: facturado - efectivo,
  };
}

/** Variación % contra el período anterior (null si no hay base). */
export function variacion(actual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return ((actual - anterior) / anterior) * 100;
}

export interface PuntoDia {
  dia: string;
  cortes: number;
  facturado: number;
}

/** Serie por día para el gráfico de barras, con los días vacíos en cero. */
export function porDia(cortes: Corte[], desde: string, hasta: string): PuntoDia[] {
  const mapa = new Map<string, PuntoDia>();
  for (let d = desde; d <= hasta; d = sumarDias(d, 1)) {
    mapa.set(d, { dia: d, cortes: 0, facturado: 0 });
    if (mapa.size > 62) break; // por las dudas
  }
  for (const c of cortes) {
    const punto = mapa.get(c.dia);
    if (punto) {
      punto.cortes += 1;
      punto.facturado += c.precio;
    }
  }
  return [...mapa.values()];
}

export interface PuntoServicio {
  servicioNombre: string;
  cortes: number;
  facturado: number;
}

/** Ranking de servicios (por facturado, descendente). */
export function porServicio(cortes: Corte[]): PuntoServicio[] {
  const mapa = new Map<string, PuntoServicio>();
  for (const c of cortes) {
    const punto = mapa.get(c.servicioNombre) ?? {
      servicioNombre: c.servicioNombre,
      cortes: 0,
      facturado: 0,
    };
    punto.cortes += 1;
    punto.facturado += c.precio;
    mapa.set(c.servicioNombre, punto);
  }
  return [...mapa.values()].sort((a, b) => b.facturado - a.facturado);
}

export interface PuntoHora {
  hora: number;
  cortes: number;
}

/** Cortes por hora del día (para ver las horas pico), de 0 a 23. */
export function porHora(cortes: Corte[]): PuntoHora[] {
  const conteo = new Array<number>(24).fill(0);
  for (const c of cortes) conteo[new Date(c.fecha).getHours()] += 1;
  return conteo.map((n, hora) => ({ hora, cortes: n }));
}

export interface PuntoBarbero {
  barberoUuid: string;
  cortes: number;
  facturado: number;
}

/** Totales por barbero (para el panel del dueño). */
export function porBarbero(cortes: Corte[]): PuntoBarbero[] {
  const mapa = new Map<string, PuntoBarbero>();
  for (const c of cortes) {
    const punto = mapa.get(c.barberoUuid) ?? {
      barberoUuid: c.barberoUuid,
      cortes: 0,
      facturado: 0,
    };
    punto.cortes += 1;
    punto.facturado += c.precio;
    mapa.set(c.barberoUuid, punto);
  }
  return [...mapa.values()].sort((a, b) => b.facturado - a.facturado);
}

/** El mejor día del período (por facturado). */
export function mejorDia(serie: PuntoDia[]): PuntoDia | null {
  const conDatos = serie.filter((p) => p.cortes > 0);
  if (!conDatos.length) return null;
  return conDatos.reduce((max, p) => (p.facturado > max.facturado ? p : max));
}

/** ¿Cuántos días del período ya pasaron? (para promedios honestos) */
export function diasTranscurridos(desde: string, hasta: string): number {
  const hoy = claveDia();
  const fin = hasta < hoy ? hasta : hoy;
  if (fin < desde) return 0;
  return Math.round((desdeClave(fin).getTime() - desdeClave(desde).getTime()) / 86400000) + 1;
}
