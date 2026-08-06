// Agregados para el dashboard: todo trabaja sobre listas de cortes ya
// filtradas por período/barbero (lógica pura, fácil de testear).

import { claveDia, desdeClave, sumarDias } from './fecha';
import type { Corte, Venta } from '../db/types';

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

// ---- Productos (ventas) ----

/** Total cobrado por una venta (precio unitario × cantidad). */
export const totalVenta = (v: Venta): number => v.precio * v.cantidad;

/** Lo que se lleva el barbero por esa venta. */
export const comisionVenta = (v: Venta): number => Math.round((totalVenta(v) * v.comision) / 100);

/** Lo que costó la mercadería vendida (para el margen real del local). */
export const costoVenta = (v: Venta): number => (v.costo ?? 0) * v.cantidad;

export interface TotalesVentas {
  ventas: number;
  unidades: number;
  facturado: number;
  costo: number;
  comisiones: number;
  efectivo: number;
  transferencia: number;
  /** Facturado − costo de la mercadería − comisiones. */
  neto: number;
}

export function totalesVentas(ventas: Venta[]): TotalesVentas {
  let facturado = 0;
  let costo = 0;
  let comisiones = 0;
  let unidades = 0;
  let efectivo = 0;
  for (const v of ventas) {
    const total = totalVenta(v);
    facturado += total;
    costo += costoVenta(v);
    comisiones += comisionVenta(v);
    unidades += v.cantidad;
    if (v.medioPago === 'efectivo') efectivo += total;
  }
  return {
    ventas: ventas.length,
    unidades,
    facturado,
    costo,
    comisiones,
    efectivo,
    transferencia: facturado - efectivo,
    neto: facturado - costo - comisiones,
  };
}

export interface PuntoProducto {
  productoNombre: string;
  unidades: number;
  facturado: number;
}

/** Ranking de productos vendidos (por facturado, descendente). */
export function porProducto(ventas: Venta[]): PuntoProducto[] {
  const mapa = new Map<string, PuntoProducto>();
  for (const v of ventas) {
    const punto = mapa.get(v.productoNombre) ?? {
      productoNombre: v.productoNombre,
      unidades: 0,
      facturado: 0,
    };
    punto.unidades += v.cantidad;
    punto.facturado += totalVenta(v);
    mapa.set(v.productoNombre, punto);
  }
  return [...mapa.values()].sort((a, b) => b.facturado - a.facturado);
}

/** Totales de productos por barbero (para el panel del dueño). */
export function ventasPorBarbero(ventas: Venta[]): Map<string, TotalesVentas> {
  const grupos = new Map<string, Venta[]>();
  for (const v of ventas) {
    const lista = grupos.get(v.barberoUuid) ?? [];
    lista.push(v);
    grupos.set(v.barberoUuid, lista);
  }
  const salida = new Map<string, TotalesVentas>();
  for (const [uuid, lista] of grupos) salida.set(uuid, totalesVentas(lista));
  return salida;
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
