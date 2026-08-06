import { db } from './db';
import { uuid } from '../lib/uuid';
import { claveDia } from '../lib/fecha';
import type { MedioPago, OrigenVenta, Producto, Venta } from './types';

export interface DatosVenta {
  producto: Producto;
  cantidad: number;
  barberoUuid: string;
  medioPago: MedioPago;
  clienteNombre?: string;
  origen?: OrigenVenta;
  fecha?: number;
}

/**
 * Registra una venta y descuenta el stock, todo en una transacción para que
 * no queden ventas sin descontar (ni al revés) si algo falla.
 */
export async function venderProducto(datos: DatosVenta): Promise<string> {
  const { producto, cantidad } = datos;
  const fecha = datos.fecha ?? Date.now();
  const nueva: Venta = {
    uuid: uuid(),
    fecha,
    dia: claveDia(new Date(fecha)),
    productoUuid: producto.uuid,
    productoNombre: producto.nombre,
    precio: producto.precio,
    costo: producto.costo ?? 0,
    cantidad,
    barberoUuid: datos.barberoUuid,
    medioPago: datos.medioPago,
    comision: producto.comision,
    comisionFija: producto.comisionFija,
    clienteNombre: datos.clienteNombre,
    origen: datos.origen ?? 'barbero',
    updatedAt: Date.now(),
  };

  await db.transaction('rw', [db.ventas, db.productos], async () => {
    await db.ventas.add(nueva);
    await db.productos
      .where('uuid')
      .equals(producto.uuid)
      .modify((p) => {
        p.stock = Math.max(0, (p.stock ?? 0) - cantidad);
        p.updatedAt = Date.now();
      });
  });
  return nueva.uuid;
}

/** Borra la venta y devuelve las unidades al stock. */
export async function borrarVenta(ventaUuid: string): Promise<void> {
  await db.transaction('rw', [db.ventas, db.productos], async () => {
    const venta = await db.ventas.where('uuid').equals(ventaUuid).first();
    if (!venta) return;
    await db.ventas.where('uuid').equals(ventaUuid).delete();
    await db.productos
      .where('uuid')
      .equals(venta.productoUuid)
      .modify((p) => {
        p.stock = (p.stock ?? 0) + venta.cantidad;
        p.updatedAt = Date.now();
      });
  });
}

/** Ventas de un día puntual, opcionalmente de un solo barbero. */
export async function ventasDelDia(dia: string, barberoUuid?: string): Promise<Venta[]> {
  let ventas = await db.ventas.where('dia').equals(dia).toArray();
  if (barberoUuid) ventas = ventas.filter((v) => v.barberoUuid === barberoUuid);
  return ventas.sort((a, b) => b.fecha - a.fecha);
}

/** Ventas en un rango de días ["YYYY-MM-DD", "YYYY-MM-DD"], ambos incluidos. */
export async function ventasEntre(
  desde: string,
  hasta: string,
  barberoUuid?: string,
): Promise<Venta[]> {
  let ventas = await db.ventas.where('dia').between(desde, hasta, true, true).toArray();
  if (barberoUuid) ventas = ventas.filter((v) => v.barberoUuid === barberoUuid);
  return ventas;
}
