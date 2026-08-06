import { db } from './db';
import { uuid } from '../lib/uuid';
import { claveDia, sumarDias, timestampDe, minAHora } from '../lib/fecha';
import type {
  Barbero,
  Bloqueo,
  Corte,
  MedioPago,
  Producto,
  Servicio,
  Turno,
  Venta,
} from './types';

// Datos de demo: ~3 semanas de cortes, turnos próximos y un bloqueo,
// para ver la app llena sin cargar nada. Se saca con "Empezar de cero".

const BARBEROS_DEMO = [
  { nombre: 'Nico', emoji: '💈', comision: 60 },
  { nombre: 'Tomi', emoji: '⚡', comision: 50 },
];

const SERVICIOS_DEMO = [
  { nombre: 'Corte', precio: 10000, duracionMin: 30, emoji: '✂️' },
  { nombre: 'Corte + barba', precio: 14000, duracionMin: 45, emoji: '🧔' },
  { nombre: 'Barba', precio: 6000, duracionMin: 20, emoji: '🪒' },
  { nombre: 'Color / mechas', precio: 20000, duracionMin: 90, emoji: '🎨' },
];

const PRODUCTOS_DEMO = [
  { nombre: 'Cera mate', precio: 20000, costo: 11000, stock: 10, comision: 0, comisionFija: 1000, emoji: '🫙' },
  { nombre: 'Cera brillante', precio: 20000, costo: 11000, stock: 8, comision: 0, comisionFija: 1000, emoji: '✨' },
  { nombre: 'Polvo texturizador', precio: 18000, costo: 9500, stock: 6, comision: 0, comisionFija: 1000, emoji: '🧴' },
];

const CLIENTES_DEMO = [
  { nombre: 'Juan Pérez', telefono: '11 5555 1234' },
  { nombre: 'Marcos Gil', telefono: '11 4444 8765' },
  { nombre: 'Santi López', telefono: '11 3333 2211', email: 'santi@mail.com' },
  { nombre: 'Fede Romero', telefono: '11 6666 9900' },
  { nombre: 'Lautaro Díaz', telefono: '11 2222 3344' },
];

// Aleatorio determinístico (misma demo cada vez).
function crearRandom(semilla: number) {
  let s = semilla;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/**
 * Carga la demo sobre la base actual (no borra lo que ya haya).
 */
export async function cargarDatosDemo(barberoExistenteUuid?: string): Promise<void> {
  const rand = crearRandom(20260714);
  const ahora = Date.now();

  // Barberos: usa el tuyo como primero y suma los de demo.
  const barberosUuids: string[] = [];
  if (barberoExistenteUuid) barberosUuids.push(barberoExistenteUuid);

  const cantidadActual = await db.barberos.count();
  const nuevosBarberos: Barbero[] = BARBEROS_DEMO.map((b, i) => ({
    uuid: uuid(),
    nombre: b.nombre,
    emoji: b.emoji,
    comision: b.comision,
    orden: cantidadActual + i + 1,
    activo: 1 as const,
    updatedAt: ahora,
  }));
  await db.barberos.bulkAdd(nuevosBarberos);
  barberosUuids.push(...nuevosBarberos.map((b) => b.uuid));

  // Servicios: reusa los que existan por nombre, crea los que falten.
  const serviciosActuales = await db.servicios.toArray();
  const servicios: Pick<Servicio, 'uuid' | 'nombre' | 'precio' | 'duracionMin'>[] = [];
  const paraCrear: Servicio[] = [];
  for (const [i, s] of SERVICIOS_DEMO.entries()) {
    const existente = serviciosActuales.find(
      (e) => e.nombre.toLowerCase() === s.nombre.toLowerCase(),
    );
    if (existente) {
      servicios.push(existente);
    } else {
      const nuevo: Servicio = {
        uuid: uuid(),
        ...s,
        orden: serviciosActuales.length + i + 1,
        activo: 1,
        updatedAt: ahora,
      };
      paraCrear.push(nuevo);
      servicios.push(nuevo);
    }
  }
  if (paraCrear.length) await db.servicios.bulkAdd(paraCrear);

  // ~21 días de cortes hacia atrás. Más movimiento jueves a sábado y a la tarde.
  const cortes: Corte[] = [];
  const hoy = claveDia();
  for (let d = 0; d < 21; d++) {
    const dia = sumarDias(hoy, -d);
    const diaSemana = new Date(timestampDe(dia, '12:00')).getDay();
    if (diaSemana === 0 || diaSemana === 1) continue; // dom y lun cerrado

    const pico = diaSemana >= 4 ? 3 : 0; // jue/vie/sáb
    for (const barberoUuid of barberosUuids) {
      const cantidad = 3 + Math.floor(rand() * (6 + pico));
      for (let c = 0; c < cantidad; c++) {
        // Horas de 9 a 19:30, cargadas hacia la tarde.
        const sesgo = Math.pow(rand(), 0.65);
        const min = 9 * 60 + Math.floor(sesgo * 21) * 30;
        const servicio = servicios[Math.floor(rand() * servicios.length)];
        const fecha = timestampDe(dia, minAHora(min));
        if (fecha > ahora) continue; // hoy: solo hasta la hora actual
        cortes.push({
          uuid: uuid(),
          fecha,
          dia,
          barberoUuid,
          servicioUuid: servicio.uuid,
          servicioNombre: servicio.nombre,
          precio: servicio.precio,
          medioPago: (rand() < 0.6 ? 'efectivo' : 'transferencia') as MedioPago,
          clienteNombre:
            rand() < 0.4 ? CLIENTES_DEMO[Math.floor(rand() * CLIENTES_DEMO.length)].nombre : undefined,
          updatedAt: ahora,
        });
      }
    }
  }
  await db.cortes.bulkAdd(cortes);

  // Productos: los primeros dos quedan del local, el resto del primer barbero.
  const productosActuales = await db.productos.count();
  const productos: Producto[] = PRODUCTOS_DEMO.map((p, i) => ({
    uuid: uuid(),
    nombre: p.nombre,
    precio: p.precio,
    costo: p.costo,
    stock: p.stock,
    comision: p.comision,
    comisionFija: p.comisionFija,
    barberoUuid: '',
    emoji: p.emoji,
    orden: productosActuales + i + 1,
    activo: 1 as const,
    updatedAt: ahora,
  }));
  await db.productos.bulkAdd(productos);

  // Ventas de productos repartidas en las últimas 3 semanas.
  const ventas: Venta[] = [];
  for (let d = 0; d < 21; d++) {
    const dia = sumarDias(hoy, -d);
    const diaSemana = new Date(timestampDe(dia, '12:00')).getDay();
    if (diaSemana === 0 || diaSemana === 1) continue;
    if (rand() < 0.45) continue; // no todos los días se vende
    const cantidadVentas = 1 + Math.floor(rand() * 2);
    for (let v = 0; v < cantidadVentas; v++) {
      const producto = productos[Math.floor(rand() * productos.length)];
      const fecha = timestampDe(dia, minAHora(11 * 60 + Math.floor(rand() * 16) * 30));
      if (fecha > ahora) continue;
      ventas.push({
        uuid: uuid(),
        fecha,
        dia,
        productoUuid: producto.uuid,
        productoNombre: producto.nombre,
        precio: producto.precio,
        costo: producto.costo,
        cantidad: rand() < 0.8 ? 1 : 2,
        barberoUuid: barberosUuids[Math.floor(rand() * barberosUuids.length)],
        medioPago: (rand() < 0.5 ? 'efectivo' : 'transferencia') as MedioPago,
        comision: producto.comision,
        comisionFija: producto.comisionFija,
        clienteNombre:
          rand() < 0.5 ? CLIENTES_DEMO[Math.floor(rand() * CLIENTES_DEMO.length)].nombre : undefined,
        origen: rand() < 0.3 ? 'link' : 'barbero',
        updatedAt: ahora,
      });
    }
  }
  await db.ventas.bulkAdd(ventas);

  // Turnos: algunos para hoy y los próximos días.
  const turnos: Turno[] = [];
  const horasTurnos = ['15:00', '16:30', '18:00'];
  for (let d = 0; d < 4; d++) {
    const dia = sumarDias(hoy, d);
    const diaSemana = new Date(timestampDe(dia, '12:00')).getDay();
    if (diaSemana === 0 || diaSemana === 1) continue;
    for (const [i, hora] of horasTurnos.entries()) {
      if (d === 0 && timestampDe(dia, hora) < ahora) continue;
      if (rand() < 0.35) continue;
      const cliente = CLIENTES_DEMO[(d + i) % CLIENTES_DEMO.length];
      const servicio = servicios[Math.floor(rand() * 3)];
      turnos.push({
        uuid: uuid(),
        dia,
        hora,
        duracionMin: servicio.duracionMin,
        barberoUuid: barberosUuids[(d + i) % barberosUuids.length],
        servicioUuid: servicio.uuid,
        servicioNombre: servicio.nombre,
        precio: servicio.precio,
        clienteNombre: cliente.nombre,
        clienteTelefono: cliente.telefono,
        clienteEmail: 'email' in cliente ? cliente.email : undefined,
        estado: rand() < 0.7 ? 'confirmado' : 'pendiente',
        origen: rand() < 0.5 ? 'barbero' : 'cliente',
        creadoEn: ahora,
        updatedAt: ahora,
      });
    }
  }
  await db.turnos.bulkAdd(turnos);

  // Un bloqueo de ejemplo: pasado mañana a la mañana, "curso de fades".
  const bloqueo: Bloqueo = {
    uuid: uuid(),
    dia: sumarDias(hoy, 2),
    desde: '09:00',
    hasta: '12:00',
    motivo: 'Curso de fades',
    barberoUuid: barberosUuids[0],
    updatedAt: ahora,
  };
  await db.bloqueos.add(bloqueo);
}

/** Borra TODO: cortes, turnos, bloqueos, barberos, servicios, stock y config. */
export async function borrarTodo(): Promise<void> {
  await Promise.all([
    db.cortes.clear(),
    db.turnos.clear(),
    db.bloqueos.clear(),
    db.barberos.clear(),
    db.servicios.clear(),
    db.productos.clear(),
    db.ventas.clear(),
    db.config.clear(),
  ]);
}
