import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { listarServicios } from '../../db/servicios';
import { listarProductos } from '../../db/productos';
import { venderProducto } from '../../db/ventas';
import { ficharCorte, actualizarCorte, borrarCorte } from '../../db/cortes';
import { formatNumero, parsePesos } from '../../lib/format';
import { claveDia, formatHora, minAHora, horaAMin, timestampDe } from '../../lib/fecha';
import { Sheet } from '../../components/Sheet';
import { Campo } from '../../components/Campo';
import { IconoTacho } from '../../components/Iconos';
import { formatPesos } from '../../lib/format';
import type { Corte, MedioPago } from '../../db/types';
import { copy } from './fichar.copy';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  barberoUuid: string;
  /** Si viene, es edición; si no, fichaje nuevo. */
  corte?: Corte;
}

const c = copy.sheet;

export function FicharSheet({ abierto, onCerrar, barberoUuid, corte }: Props) {
  const servicios = useLiveQuery(() => listarServicios(), []) ?? [];
  // Productos que este barbero puede vender (los suyos + los del local).
  const productos =
    useLiveQuery(() => listarProductos({ barberoUuid }), [barberoUuid])?.filter((p) => p.stock > 0) ??
    [];
  /** Cuántas unidades de cada producto se lleva el cliente con este corte. */
  const [llevados, setLlevados] = useState<Record<string, number>>({});

  const [servicioUuid, setServicioUuid] = useState('');
  const [precio, setPrecio] = useState(0);
  const [medioPago, setMedioPago] = useState<MedioPago>('efectivo');
  const [hora, setHora] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');

  // Al abrir: estado limpio (nuevo) o precargado (edición).
  useEffect(() => {
    if (!abierto) return;
    if (corte) {
      setServicioUuid(corte.servicioUuid);
      setPrecio(corte.precio);
      setMedioPago(corte.medioPago);
      setHora(formatHora(corte.fecha));
      setClienteNombre(corte.clienteNombre ?? '');
    } else {
      setServicioUuid('');
      setPrecio(0);
      setMedioPago('efectivo');
      const ahora = new Date();
      setHora(minAHora(Math.floor((ahora.getHours() * 60 + ahora.getMinutes()) / 5) * 5));
      setClienteNombre('');
    }
    setLlevados({});
  }, [abierto, corte]);

  const servicioElegido = useMemo(
    () => servicios.find((s) => s.uuid === servicioUuid),
    [servicios, servicioUuid],
  );

  function elegirServicio(uuid: string) {
    setServicioUuid(uuid);
    const s = servicios.find((x) => x.uuid === uuid);
    if (s) setPrecio(s.precio);
  }

  // Total que paga el cliente: el corte más lo que se lleva.
  const totalConProductos =
    precio +
    productos.reduce((acc, p) => acc + p.precio * (llevados[p.uuid] ?? 0), 0);

  async function guardar() {
    if (!servicioElegido || !hora) return;
    const dia = corte ? corte.dia : claveDia();
    const datos = {
      fecha: timestampDe(dia, minAHora(horaAMin(hora))),
      barberoUuid: corte?.barberoUuid ?? barberoUuid,
      servicioUuid: servicioElegido.uuid,
      servicioNombre: servicioElegido.nombre,
      precio,
      medioPago,
      clienteNombre: clienteNombre.trim() || undefined,
    };
    if (corte) await actualizarCorte(corte.uuid, datos);
    else await ficharCorte(datos);

    // Lo que se llevó junto con el corte se registra como venta.
    for (const p of productos) {
      const cantidad = llevados[p.uuid] ?? 0;
      if (cantidad > 0) {
        await venderProducto({
          producto: p,
          cantidad,
          barberoUuid: datos.barberoUuid,
          medioPago,
          clienteNombre: datos.clienteNombre,
          fecha: datos.fecha,
        });
      }
    }
    onCerrar();
  }

  async function borrar() {
    if (!corte) return;
    if (!window.confirm(c.confirmarBorrar)) return;
    await borrarCorte(corte.uuid);
    onCerrar();
  }

  return (
    <Sheet abierto={abierto} onCerrar={onCerrar} titulo={corte ? c.tituloEditar : c.tituloNuevo}>
      <div className="space-y-4">
        <Campo label={c.servicio}>
          {servicios.length === 0 ? (
            <p className="text-sm text-carbon-900/50">{c.sinServicios}</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {servicios.map((s) => {
                const activo = s.uuid === servicioUuid;
                return (
                  <button
                    key={s.uuid}
                    type="button"
                    onClick={() => elegirServicio(s.uuid)}
                    className={`rounded-2xl border-2 p-3 text-left transition ${
                      activo ? 'border-carbon bg-carbon text-white' : 'border-carbon/15 bg-white'
                    }`}
                  >
                    <span className="block text-xl">{s.emoji}</span>
                    <span className="block truncate text-sm font-semibold">{s.nombre}</span>
                    <span className={`num block text-sm ${activo ? 'text-white/70' : 'text-carbon-900/50'}`}>
                      $ {formatNumero(s.precio)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Campo>

        <div className="grid grid-cols-2 gap-3">
          <Campo label={c.precio}>
            <div className="flex items-center gap-1 rounded-2xl border-2 border-carbon/15 bg-white px-3">
              <span className="font-semibold text-carbon-900/40">$</span>
              <input
                className="num w-full py-3 text-right text-lg font-semibold outline-none"
                inputMode="numeric"
                value={formatNumero(precio)}
                onChange={(e) => setPrecio(parsePesos(e.target.value))}
              />
            </div>
          </Campo>
          <Campo label={c.hora}>
            <input
              type="time"
              className="input-texto num py-3"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
            />
          </Campo>
        </div>

        <Campo label={c.medio}>
          <div className="grid grid-cols-2 gap-2">
            {(['efectivo', 'transferencia'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMedioPago(m)}
                className={`rounded-2xl border-2 py-3 font-semibold transition ${
                  medioPago === m ? 'border-carbon bg-carbon text-white' : 'border-carbon/15 bg-white'
                }`}
              >
                {m === 'efectivo' ? c.efectivo : c.transferencia}
              </button>
            ))}
          </div>
        </Campo>

        <Campo label={c.cliente}>
          <input
            className="input-texto"
            value={clienteNombre}
            onChange={(e) => setClienteNombre(e.target.value)}
            placeholder={c.clientePlaceholder}
          />
        </Campo>

        {/* ¿Se llevó algo? Solo al fichar (en edición no tocamos las ventas). */}
        {!corte && productos.length > 0 && (
          <Campo label={c.productos}>
            <div className="space-y-2">
              {productos.map((p) => {
                const cant = llevados[p.uuid] ?? 0;
                return (
                  <div
                    key={p.uuid}
                    className={`flex items-center gap-3 rounded-2xl border-2 p-3 transition ${
                      cant > 0 ? 'border-carbon bg-carbon-50' : 'border-carbon/15 bg-white'
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {p.emoji ? `${p.emoji} ` : ''}
                        {p.nombre}
                      </span>
                      <span className="num block text-xs text-carbon-900/50">
                        {formatPesos(p.precio)}
                      </span>
                    </span>
                    {cant === 0 ? (
                      <button
                        type="button"
                        onClick={() => setLlevados({ ...llevados, [p.uuid]: 1 })}
                        className="shrink-0 rounded-xl bg-carbon-100 px-3 py-2 text-sm font-bold text-carbon-900/70"
                      >
                        {c.sumar}
                      </button>
                    ) : (
                      <span className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          aria-label="-"
                          onClick={() => setLlevados({ ...llevados, [p.uuid]: cant - 1 })}
                          className="h-9 w-9 rounded-lg bg-carbon-100 text-lg font-bold text-carbon-900/60"
                        >
                          −
                        </button>
                        <span className="num w-4 text-center font-extrabold">{cant}</span>
                        <button
                          type="button"
                          aria-label="+"
                          disabled={cant >= p.stock}
                          onClick={() => setLlevados({ ...llevados, [p.uuid]: cant + 1 })}
                          className="h-9 w-9 rounded-lg bg-carbon-100 text-lg font-bold text-carbon-900/60 disabled:opacity-40"
                        >
                          +
                        </button>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </Campo>
        )}

        <button
          type="button"
          className="btn-primario"
          disabled={!servicioElegido || !hora || precio <= 0}
          onClick={guardar}
        >
          {corte ? c.guardar : totalConProductos > precio ? c.ficharTotal(totalConProductos) : c.fichar}
        </button>

        {corte && (
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 py-2 font-semibold text-rojo"
            onClick={borrar}
          >
            <IconoTacho width={18} height={18} />
            {c.borrar}
          </button>
        )}
      </div>
    </Sheet>
  );
}
