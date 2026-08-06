import { useMemo, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { obtenerConfig } from '../../db/config';
import { listarBarberos } from '../../db/barberos';
import { listarProductos } from '../../db/productos';
import { formatPesos } from '../../lib/format';
import { linkWhatsApp, mensajePedido, linkReservasBarbero } from '../../lib/mensajes';
import { Logo } from '../../components/Logo';
import { IconoWhatsApp } from '../../components/Iconos';
import { copy } from './tienda.copy';

/** El uuid del barbero viene en el hash: "#/tienda?b=<uuid>". */
function barberoDelHash(): string {
  const q = location.hash.split('?')[1] ?? '';
  return new URLSearchParams(q).get('b') ?? '';
}

/**
 * Tienda pública (#/tienda?b=uuid): la ve el cliente desde el link que el
 * barbero comparte en Instagram. Arma el pedido y lo manda por WhatsApp.
 */
export function Tienda() {
  const barberoUuid = useMemo(barberoDelHash, []);
  const config = useLiveQuery(() => obtenerConfig());
  const barberos = useLiveQuery(() => listarBarberos(), []) ?? [];
  const productos = useLiveQuery(() => listarProductos({ barberoUuid }), [barberoUuid]) ?? [];

  const [carrito, setCarrito] = useState<Record<string, number>>({});
  const [nombre, setNombre] = useState('');

  const barbero = barberos.find((b) => b.uuid === barberoUuid);

  if (!config) return null;

  if (!barbero) {
    return (
      <Marco nombreBarberia={config.nombreBarberia}>
        <p className="py-10 text-center text-sm text-carbon-900/55">{copy.noEncontrado}</p>
      </Marco>
    );
  }

  const disponibles = productos.filter((p) => p.stock > 0);

  const items = disponibles
    .filter((p) => (carrito[p.uuid] ?? 0) > 0)
    .map((p) => ({ nombre: p.nombre, cantidad: carrito[p.uuid], precio: p.precio }));
  const total = items.reduce((a, i) => a + i.precio * i.cantidad, 0);

  const cambiar = (uuid: string, delta: number, max: number) =>
    setCarrito((c) => ({ ...c, [uuid]: Math.min(max, Math.max(0, (c[uuid] ?? 0) + delta)) }));

  const nombreBarbero = `${barbero.emoji ? `${barbero.emoji} ` : ''}${barbero.nombre}`;

  return (
    <Marco nombreBarberia={config.nombreBarberia} subtitulo={copy.de(barbero.nombre)}>
      {disponibles.length === 0 ? (
        <p className="py-10 text-center text-sm text-carbon-900/55">{copy.vacio}</p>
      ) : (
        <ul className="space-y-2">
          {disponibles.map((p) => {
            const cant = carrito[p.uuid] ?? 0;
            return (
              <li key={p.uuid} className="card flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">
                    {p.emoji ? `${p.emoji} ` : ''}
                    {p.nombre}
                  </p>
                  <p className="num text-sm text-carbon-900/55">
                    {formatPesos(p.precio)}
                    {p.stock <= 3 && (
                      <span className="ml-2 text-xs font-semibold text-oro-dark">
                        {p.stock === 1 ? copy.ultima : copy.quedan(p.stock)}
                      </span>
                    )}
                  </p>
                </div>
                {cant === 0 ? (
                  <button
                    type="button"
                    onClick={() => cambiar(p.uuid, 1, p.stock)}
                    className="shrink-0 rounded-xl bg-carbon px-4 py-2 text-sm font-bold text-white transition active:scale-95"
                  >
                    {copy.agregar}
                  </button>
                ) : (
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => cambiar(p.uuid, -1, p.stock)}
                      aria-label={copy.quitar}
                      className="h-9 w-9 rounded-lg bg-carbon-100 text-lg font-bold text-carbon-900/60 transition active:scale-95"
                    >
                      −
                    </button>
                    <span className="num w-5 text-center font-extrabold">{cant}</span>
                    <button
                      type="button"
                      onClick={() => cambiar(p.uuid, 1, p.stock)}
                      disabled={cant >= p.stock}
                      aria-label={copy.agregar}
                      className="h-9 w-9 rounded-lg bg-carbon-100 text-lg font-bold text-carbon-900/60 transition active:scale-95 disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {items.length > 0 && (
        <div className="card mt-4 space-y-3 p-4">
          <h2 className="font-bold">{copy.tuPedido}</h2>
          <ul className="space-y-1 text-sm">
            {items.map((i) => (
              <li key={i.nombre} className="flex justify-between">
                <span className="min-w-0 truncate">
                  {i.cantidad}× {i.nombre}
                </span>
                <span className="num shrink-0 font-semibold">{formatPesos(i.precio * i.cantidad)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-carbon-100 pt-2">
            <span className="font-bold">{copy.total}</span>
            <span className="num text-xl font-extrabold">{formatPesos(total)}</span>
          </div>
          <input
            className="input-texto"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={copy.nombrePh}
            aria-label={copy.nombre}
          />
          {barbero.telefono ? (
            <a
              href={linkWhatsApp(
                barbero.telefono,
                mensajePedido(items, barbero.nombre, nombre.trim() || undefined),
              )}
              target="_blank"
              rel="noreferrer"
              className="btn-primario py-3 text-base"
            >
              <IconoWhatsApp width={20} height={20} /> {copy.pedir}
            </a>
          ) : (
            <p className="text-center text-sm font-semibold text-rojo">{copy.sinWhatsapp}</p>
          )}
          <p className="text-xs text-carbon-900/45">{copy.ayuda}</p>
        </div>
      )}

      <a
        href={linkReservasBarbero(barberoUuid)}
        className="mt-4 block py-3 text-center text-sm font-semibold text-carbon-900/55 underline"
      >
        {copy.reservar}
      </a>
      <p className="pb-6 pt-2 text-center text-xs text-carbon-900/35">{nombreBarbero}</p>
    </Marco>
  );
}

function Marco({
  nombreBarberia,
  subtitulo,
  children,
}: {
  nombreBarberia: string;
  subtitulo?: string;
  children: ReactNode;
}) {
  return (
    <div className="safe-top mx-auto min-h-full w-full max-w-md px-4">
      <header className="flex flex-col items-center gap-1 py-6 text-center">
        <Logo chico />
        <h1 className="text-2xl font-extrabold">{copy.titulo}</h1>
        <p className="text-sm text-carbon-900/50">{subtitulo ?? nombreBarberia}</p>
      </header>
      {children}
    </div>
  );
}
