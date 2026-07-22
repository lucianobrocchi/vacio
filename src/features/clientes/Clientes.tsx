import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { listarBarberos } from '../../db/barberos';
import { cargarCartera, type Cliente, type EstadoCliente } from '../../lib/clientes';
import { formatPesos } from '../../lib/format';
import { Pantalla } from '../../components/Pantalla';
import { BarberoChips } from '../../components/BarberoChips';
import { IconoClientes } from '../../components/Iconos';
import { ClienteDetalle } from './ClienteDetalle';
import type { Config } from '../../db/types';
import { copy } from './clientes.copy';

type Filtro = 'todos' | EstadoCliente;

const PUNTO: Record<string, string> = {
  frecuente: 'bg-ok',
  enRiesgo: 'bg-pendiente',
  nuevo: 'bg-confirmado',
  normal: 'bg-carbon-200',
};

export function Clientes({ config }: { config: Config }) {
  // El dueño arranca viendo toda la barbería; el barbero, su cartera.
  const [barberoUuid, setBarberoUuid] = useState(config.esDuenio ? '' : config.barberoActivoUuid);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [detalle, setDetalle] = useState<Cliente | null>(null);

  const barberos = useLiveQuery(() => listarBarberos(), []) ?? [];
  const cartera = useLiveQuery(() => cargarCartera(barberoUuid || undefined), [barberoUuid]);

  const conteos = useMemo(() => {
    const c: Record<Filtro, number> = { todos: 0, frecuente: 0, enRiesgo: 0, nuevo: 0, normal: 0 };
    for (const cl of cartera ?? []) {
      c.todos++;
      c[cl.estado]++;
    }
    return c;
  }, [cartera]);

  const lista = useMemo(() => {
    let l = cartera ?? [];
    if (filtro !== 'todos') l = l.filter((c) => c.estado === filtro);
    const q = busqueda.trim().toLowerCase();
    if (q) l = l.filter((c) => c.nombre.toLowerCase().includes(q) || c.telefono?.includes(q));
    return l;
  }, [cartera, filtro, busqueda]);

  const filtros: Filtro[] = ['todos', 'frecuente', 'enRiesgo', 'nuevo'];

  return (
    <Pantalla titulo={copy.titulo} subtitulo={copy.subtitulo(conteos.todos)}>
      {config.esDuenio && (
        <BarberoChips barberos={barberos} activoUuid={barberoUuid} onCambiar={setBarberoUuid} conTodos />
      )}

      <input
        className="input-texto mb-3 py-3 text-base"
        placeholder={copy.buscar}
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      <div className="sin-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
        {filtros.map((f) => {
          const activo = filtro === f;
          const n = conteos[f];
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFiltro(f)}
              className={`shrink-0 rounded-full border-2 px-3.5 py-1.5 text-sm font-semibold transition ${
                activo ? 'border-carbon bg-carbon text-white' : 'border-carbon/15 bg-white'
              }`}
            >
              {copy.filtros[f]}
              {n > 0 && f !== 'todos' && (
                <span className={`ml-1.5 ${activo ? 'text-white/60' : 'text-carbon-900/40'}`}>{n}</span>
              )}
            </button>
          );
        })}
      </div>

      {cartera && conteos.todos === 0 && (
        <div className="card flex flex-col items-center gap-2 p-8 text-center">
          <IconoClientes width={36} height={36} className="text-carbon-900/25" />
          <p className="font-semibold">{copy.vacio.titulo}</p>
          <p className="text-sm text-carbon-900/50">{copy.vacio.bajada}</p>
        </div>
      )}
      {cartera && conteos.todos > 0 && lista.length === 0 && (
        <p className="card p-6 text-center text-sm text-carbon-900/50">{copy.sinResultados}</p>
      )}

      <ul className="space-y-2">
        {lista.map((cl, i) => (
          <li key={cl.clave} className="anim-subir" style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}>
            <button
              type="button"
              onClick={() => setDetalle(cl)}
              className="card flex w-full items-center gap-3 p-3.5 text-left transition active:scale-[0.99]"
            >
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-carbon text-lg font-bold text-oro">
                {cl.nombre.charAt(0).toUpperCase()}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${PUNTO[cl.estado]}`}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{cl.nombre}</span>
                <span className="block truncate text-sm text-carbon-900/50">
                  {cl.frecuenciaDias != null
                    ? copy.fila.vieneCada(cl.frecuenciaDias)
                    : cl.visitas === 1
                      ? copy.fila.unaVisita
                      : copy.fila.visitas(cl.visitas)}
                  {cl.proximoTurno ? ` · 📅 ${copy.fila.turnoProximo}` : ''}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-semibold text-carbon-900/70">
                  {copy.fila.hace(cl.haceDias)}
                </span>
                <span className="num block text-sm font-bold">{formatPesos(cl.gastado)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {detalle && (
        <ClienteDetalle
          cliente={detalle}
          onCerrar={() => setDetalle(null)}
          nombreBarberia={config.nombreBarberia}
        />
      )}
    </Pantalla>
  );
}
