import { db } from './db';
import { uuid } from '../lib/uuid';
import type { Producto } from './types';

/** Comisión por defecto que se lleva el barbero por vender un producto. */
export const COMISION_PRODUCTO_DEFAULT = 20;

/** Comisión fija sugerida: lo que le queda al barbero por unidad vendida. */
export const COMISION_PRODUCTO_FIJA_DEFAULT = 1000;

/**
 * Productos visibles para un barbero: los suyos + los del local.
 * Sin `barberoUuid` (o el dueño), devuelve todo el catálogo.
 */
export async function listarProductos(opciones?: {
  barberoUuid?: string;
  incluirInactivos?: boolean;
}): Promise<Producto[]> {
  const todos = await db.productos.orderBy('orden').toArray();
  const activos = opciones?.incluirInactivos ? todos : todos.filter((p) => p.activo === 1);
  if (!opciones?.barberoUuid) return activos;
  return activos.filter((p) => !p.barberoUuid || p.barberoUuid === opciones.barberoUuid);
}

export async function crearProducto(datos: {
  nombre: string;
  precio: number;
  costo?: number;
  stock?: number;
  comision?: number;
  comisionFija?: number;
  barberoUuid?: string;
  emoji?: string;
}): Promise<string> {
  const orden = (await db.productos.count()) + 1;
  const nuevo: Producto = {
    uuid: uuid(),
    nombre: datos.nombre.trim(),
    precio: datos.precio,
    costo: datos.costo ?? 0,
    stock: datos.stock ?? 0,
    comision: datos.comision ?? COMISION_PRODUCTO_DEFAULT,
    comisionFija: datos.comisionFija,
    barberoUuid: datos.barberoUuid ?? '',
    emoji: datos.emoji,
    orden,
    activo: 1,
    updatedAt: Date.now(),
  };
  await db.productos.add(nuevo);
  return nuevo.uuid;
}

export async function actualizarProducto(
  productoUuid: string,
  cambios: Partial<Omit<Producto, 'id' | 'uuid'>>,
): Promise<void> {
  await db.productos
    .where('uuid')
    .equals(productoUuid)
    .modify({ ...cambios, updatedAt: Date.now() });
}

/** Baja lógica: conserva el historial de ventas. */
export async function desactivarProducto(productoUuid: string): Promise<void> {
  await actualizarProducto(productoUuid, { activo: 0 });
}

/** Suma (o resta, con negativo) unidades al stock. Nunca baja de cero. */
export async function ajustarStock(productoUuid: string, delta: number): Promise<void> {
  await db.productos
    .where('uuid')
    .equals(productoUuid)
    .modify((p) => {
      p.stock = Math.max(0, (p.stock ?? 0) + delta);
      p.updatedAt = Date.now();
    });
}

export async function obtenerProducto(productoUuid: string): Promise<Producto | undefined> {
  return db.productos.where('uuid').equals(productoUuid).first();
}
