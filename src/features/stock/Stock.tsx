import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  listarProductos,
  crearProducto,
  actualizarProducto,
  desactivarProducto,
  COMISION_PRODUCTO_DEFAULT,
} from '../../db/productos';
import { venderProducto, ventasEntre } from '../../db/ventas';
import { totalesVentas, totalVenta, comisionVenta } from '../../lib/stats';
import { rangoPeriodo } from '../../lib/fecha';
import { formatPesos, formatNumero, parsePesos } from '../../lib/format';
import { linkTienda } from '../../lib/mensajes';
import { Pantalla } from '../../components/Pantalla';
import { Sheet } from '../../components/Sheet';
import { Campo } from '../../components/Campo';
import { NumeroAnimado } from '../../components/NumeroAnimado';
import { IconoMas, IconoCopiar, IconoCheck, IconoTacho } from '../../components/Iconos';
import type { Config, MedioPago, Producto } from '../../db/types';
import { copy } from './stock.copy';

type Periodo = 'hoy' | 'semana' | 'mes';

/**
 * Stock del barbero: sus productos, venderlos en 2 toques y su link público
 * para que los clientes le encarguen por WhatsApp.
 */
export function Stock({ config }: { config: Config }) {
  const yo = config.barberoActivoUuid;
  const [periodo, setPeriodo] = useState<Periodo>('semana');
  const [editando, setEditando] = useState<Producto | null>(null);
  const [creando, setCreando] = useState(false);
  const [vendiendo, setVendiendo] = useState<Producto | null>(null);
  const [copiado, setCopiado] = useState(false);

  const productos = useLiveQuery(() => listarProductos({ barberoUuid: yo }), [yo]) ?? [];
  const [desde, hasta] = rangoPeriodo(periodo);
  const ventas = useLiveQuery(() => ventasEntre(desde, hasta, yo), [desde, hasta, yo]) ?? [];

  const t = totalesVentas(ventas);

  async function copiarLink() {
    await navigator.clipboard?.writeText(linkTienda(yo));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <Pantalla
      titulo={copy.titulo}
      accion={
        <button
          type="button"
          onClick={() => setCreando(true)}
          aria-label={copy.agregar}
          className="rounded-full bg-carbon p-2 text-white transition active:scale-95"
        >
          <IconoMas width={20} height={20} />
        </button>
      }
    >
      {/* Período */}
      <div className="mb-4 flex rounded-2xl bg-carbon-100 p-1">
        {(Object.keys(copy.periodos) as Periodo[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriodo(p)}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
              periodo === p ? 'bg-white text-carbon shadow-card' : 'text-carbon-900/50'
            }`}
          >
            {copy.periodos[p]}
          </button>
        ))}
      </div>

      {/* Hero: lo que gana el barbero */}
      <div className="mb-3 rounded-3xl bg-gradient-to-br from-carbon-700 to-carbon-900 p-5 text-white shadow-card">
        <p className="text-sm font-semibold text-oro">{copy.resumen.comision}</p>
        <p className="mt-1 text-[2.6rem] font-extrabold leading-none">
          <NumeroAnimado valor={t.comisiones} duracion={900} />
        </p>
        <p className="num mt-1 text-sm text-white/60">
          {formatPesos(t.facturado)} · {t.unidades} {copy.resumen.unidades.toLowerCase()}
        </p>
      </div>

      {/* Link de venta */}
      <div className="card mb-4 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-carbon-900/40">
          {copy.miLink}
        </p>
        <p className="mt-1 truncate text-sm text-carbon-900/60">{linkTienda(yo)}</p>
        <button
          type="button"
          onClick={copiarLink}
          className="btn-secundario mt-2 w-full py-2.5 text-base"
        >
          {copiado ? (
            <>
              <IconoCheck width={17} height={17} /> {copy.copiado}
            </>
          ) : (
            <>
              <IconoCopiar width={17} height={17} /> {copy.copiar}
            </>
          )}
        </button>
        <p className="mt-2 text-xs text-carbon-900/45">{copy.miLinkAyuda}</p>
      </div>

      {/* Productos */}
      <div className="card mb-4 p-4">
        <h3 className="mb-2 font-bold">{copy.productos}</h3>
        {productos.length === 0 ? (
          <p className="py-3 text-sm text-carbon-900/50">{copy.vacio}</p>
        ) : (
          <ul className="divide-y divide-carbon/5">
            {productos.map((p, i) => (
              <li
                key={p.uuid}
                className="anim-subir flex items-center gap-3 py-3"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <button
                  type="button"
                  onClick={() => setEditando(p)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate font-semibold">
                    {p.emoji ? `${p.emoji} ` : ''}
                    {p.nombre}
                    {!p.barberoUuid && (
                      <span className="ml-1.5 rounded bg-carbon-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-carbon-900/50">
                        {copy.delLocal}
                      </span>
                    )}
                  </p>
                  <p className="num text-xs text-carbon-900/50">
                    {formatPesos(p.precio)} ·{' '}
                    <span className={p.stock === 0 ? 'font-bold text-rojo' : ''}>
                      {p.stock === 0 ? copy.sinStock : copy.quedan(p.stock)}
                    </span>{' '}
                    · {p.comision}%
                  </p>
                </button>
                <button
                  type="button"
                  disabled={p.stock === 0}
                  onClick={() => setVendiendo(p)}
                  className="shrink-0 rounded-xl bg-carbon px-4 py-2 text-sm font-bold text-white transition active:scale-95 disabled:bg-carbon-100 disabled:text-carbon-900/30"
                >
                  {copy.vender}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Ventas del período */}
      <div className="card mb-4 p-4">
        <h3 className="mb-2 font-bold">{copy.ventasHoy}</h3>
        {ventas.length === 0 ? (
          <p className="text-sm text-carbon-900/50">{copy.sinVentas}</p>
        ) : (
          <ul className="space-y-2">
            {[...ventas]
              .sort((a, b) => b.fecha - a.fecha)
              .map((v) => (
                <li key={v.uuid} className="flex items-center gap-3 text-sm">
                  <span className="min-w-0 flex-1 truncate">
                    {v.cantidad}× {v.productoNombre}
                    {v.clienteNombre ? ` · ${v.clienteNombre}` : ''}
                  </span>
                  <span className="num shrink-0 font-semibold">{formatPesos(totalVenta(v))}</span>
                  <span className="num shrink-0 text-oro-dark">+{formatPesos(comisionVenta(v))}</span>
                </li>
              ))}
          </ul>
        )}
      </div>

      {(creando || editando) && (
        <FormProducto
          producto={editando}
          barberoUuid={yo}
          onCerrar={() => {
            setCreando(false);
            setEditando(null);
          }}
        />
      )}

      {vendiendo && <FormVenta producto={vendiendo} barberoUuid={yo} onCerrar={() => setVendiendo(null)} />}
    </Pantalla>
  );
}

/** Alta / edición de un producto. */
function FormProducto({
  producto,
  barberoUuid,
  onCerrar,
}: {
  producto: Producto | null;
  barberoUuid: string;
  onCerrar: () => void;
}) {
  const f = copy.form;
  const [nombre, setNombre] = useState(producto?.nombre ?? '');
  const [precio, setPrecio] = useState(producto ? formatNumero(producto.precio) : '');
  const [costo, setCosto] = useState(producto ? formatNumero(producto.costo ?? 0) : '');
  const [stock, setStock] = useState(String(producto?.stock ?? 0));
  const [comision, setComision] = useState(String(producto?.comision ?? COMISION_PRODUCTO_DEFAULT));
  const [mio, setMio] = useState(producto ? !!producto.barberoUuid : true);

  const valido = nombre.trim() !== '' && parsePesos(precio) > 0;

  async function guardar() {
    if (!valido) return;
    const datos = {
      nombre: nombre.trim(),
      precio: parsePesos(precio),
      costo: parsePesos(costo),
      stock: Number(stock) || 0,
      comision: Math.min(100, Math.max(0, Number(comision) || 0)),
      barberoUuid: mio ? barberoUuid : '',
    };
    if (producto) await actualizarProducto(producto.uuid, datos);
    else await crearProducto(datos);
    onCerrar();
  }

  async function borrar() {
    if (!producto || !window.confirm(f.confirmarBorrar)) return;
    await desactivarProducto(producto.uuid);
    onCerrar();
  }

  return (
    <Sheet abierto onCerrar={onCerrar} titulo={producto ? f.editar : f.nuevo}>
      <div className="space-y-3">
        <Campo label={f.nombre}>
          <input
            className="input-texto"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={f.nombrePh}
            autoFocus={!producto}
          />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label={f.precio}>
            <input
              className="input-texto num"
              inputMode="numeric"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder="0"
            />
          </Campo>
          <Campo label={f.costo}>
            <input
              className="input-texto num"
              inputMode="numeric"
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
              placeholder="0"
            />
          </Campo>
        </div>
        <p className="-mt-1 text-xs text-carbon-900/45">{f.costoAyuda}</p>
        <div className="grid grid-cols-2 gap-3">
          <Campo label={f.stock}>
            <input
              className="input-texto num"
              inputMode="numeric"
              value={stock}
              onChange={(e) => setStock(e.target.value.replace(/\D/g, ''))}
              placeholder="0"
            />
          </Campo>
          <Campo label={f.comision}>
            <input
              className="input-texto num"
              inputMode="numeric"
              value={comision}
              onChange={(e) => setComision(e.target.value.replace(/\D/g, ''))}
              placeholder="20"
            />
          </Campo>
        </div>
        <p className="-mt-1 text-xs text-carbon-900/45">{f.comisionAyuda}</p>
        <Campo label={f.deQuien}>
          <div className="flex gap-2">
            {[
              { v: true, label: f.mio },
              { v: false, label: f.local },
            ].map((o) => (
              <button
                key={String(o.v)}
                type="button"
                onClick={() => setMio(o.v)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
                  mio === o.v ? 'bg-carbon text-white' : 'bg-carbon-100 text-carbon-900/60'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </Campo>
        <button type="button" className="btn-primario py-3 text-base" disabled={!valido} onClick={guardar}>
          {f.guardar}
        </button>
        {producto && (
          <button
            type="button"
            onClick={borrar}
            className="flex w-full items-center justify-center gap-2 py-2 text-sm font-semibold text-rojo"
          >
            <IconoTacho width={16} height={16} /> {f.borrar}
          </button>
        )}
      </div>
    </Sheet>
  );
}

/** Registrar una venta de un producto. */
function FormVenta({
  producto,
  barberoUuid,
  onCerrar,
}: {
  producto: Producto;
  barberoUuid: string;
  onCerrar: () => void;
}) {
  const v = copy.venta;
  const [cantidad, setCantidad] = useState(1);
  const [medioPago, setMedioPago] = useState<MedioPago>('efectivo');
  const [cliente, setCliente] = useState('');
  const [guardando, setGuardando] = useState(false);

  const total = producto.precio * cantidad;
  const ganancia = Math.round((total * producto.comision) / 100);

  async function confirmar() {
    if (guardando) return;
    setGuardando(true);
    await venderProducto({
      producto,
      cantidad,
      barberoUuid,
      medioPago,
      clienteNombre: cliente.trim() || undefined,
    });
    onCerrar();
  }

  return (
    <Sheet abierto onCerrar={onCerrar} titulo={`${v.titulo} · ${producto.nombre}`}>
      <div className="space-y-3">
        <Campo label={v.cantidad}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCantidad((c) => Math.max(1, c - 1))}
              className="h-12 w-12 shrink-0 rounded-xl bg-carbon-100 text-2xl font-bold text-carbon-900/60 transition active:scale-95"
            >
              −
            </button>
            <span className="num flex-1 text-center text-3xl font-extrabold">{cantidad}</span>
            <button
              type="button"
              onClick={() => setCantidad((c) => Math.min(producto.stock, c + 1))}
              disabled={cantidad >= producto.stock}
              className="h-12 w-12 shrink-0 rounded-xl bg-carbon-100 text-2xl font-bold text-carbon-900/60 transition active:scale-95 disabled:opacity-40"
            >
              +
            </button>
          </div>
        </Campo>
        <Campo label={v.medioPago}>
          <div className="flex gap-2">
            {(
              [
                { id: 'efectivo', label: v.efectivo },
                { id: 'transferencia', label: v.transferencia },
              ] as const
            ).map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setMedioPago(o.id)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
                  medioPago === o.id ? 'bg-carbon text-white' : 'bg-carbon-100 text-carbon-900/60'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </Campo>
        <Campo label={v.cliente}>
          <input
            className="input-texto"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            placeholder={v.clientePh}
          />
        </Campo>
        <div className="flex items-center justify-between rounded-2xl bg-carbon-50 px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-carbon-900/40">
              {v.total}
            </p>
            <p className="num text-xl font-extrabold">{formatPesos(total)}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-carbon-900/40">
              {v.ganas}
            </p>
            <p className="num text-xl font-extrabold text-oro-dark">{formatPesos(ganancia)}</p>
          </div>
        </div>
        <button type="button" className="btn-primario py-3 text-base" disabled={guardando} onClick={confirmar}>
          {v.confirmar}
        </button>
      </div>
    </Sheet>
  );
}
