import { useLiveQuery } from 'dexie-react-hooks';
import { cortesEntre } from '../../db/cortes';
import { totales, porDia, porServicio, mejorDia } from '../../lib/stats';
import { formatPesos, formatNumero } from '../../lib/format';
import { Sheet } from '../../components/Sheet';
import { NumeroAnimado } from '../../components/NumeroAnimado';
import { AreaChart } from '../stats/graficos/AreaChart';
import type { Barbero } from '../../db/types';
import { copy } from './duenio.copy';

const c = copy.detalle;

interface Props {
  barbero: Barbero;
  desde: string;
  hasta: string;
  /** Etiqueta del período elegido ("Semana", "Mes"…), para el título. */
  etiquetaPeriodo: string;
  onCerrar: () => void;
}

/** Stats individuales de un barbero (se abre tocándolo en el panel Barbería). */
export function BarberoDetalle({ barbero, desde, hasta, etiquetaPeriodo, onCerrar }: Props) {
  const cortes = useLiveQuery(() => cortesEntre(desde, hasta, barbero.uuid), [desde, hasta, barbero.uuid]);

  const t = totales(cortes ?? []);
  const comision = Math.round((t.facturado * barbero.comision) / 100);
  const serie = porDia(cortes ?? [], desde, hasta);
  const mejor = mejorDia(serie);
  const idxMejor = mejor ? serie.findIndex((p) => p.dia === mejor.dia) : undefined;
  const servs = porServicio(cortes ?? []).slice(0, 4);

  // Clientes del barbero en el período.
  const porCliente = new Map<string, { nombre: string; visitas: Set<string>; gastado: number }>();
  for (const corte of cortes ?? []) {
    const nombre = corte.clienteNombre?.trim();
    if (!nombre) continue;
    const clave = nombre.toLowerCase();
    const e = porCliente.get(clave) ?? { nombre, visitas: new Set<string>(), gastado: 0 };
    e.visitas.add(corte.dia);
    e.gastado += corte.precio;
    porCliente.set(clave, e);
  }
  const topClientes = [...porCliente.values()].sort((a, b) => b.gastado - a.gastado).slice(0, 5);

  return (
    <Sheet
      abierto
      onCerrar={onCerrar}
      titulo={`${barbero.emoji ? `${barbero.emoji} ` : ''}${barbero.nombre} · ${etiquetaPeriodo}`}
    >
      <div className="space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="anim-subir rounded-2xl bg-gradient-to-br from-carbon-700 to-carbon-900 p-4 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-oro">{c.kpis.facturado}</p>
            <p className="mt-1 text-2xl font-extrabold">
              <NumeroAnimado valor={t.facturado} />
            </p>
          </div>
          <div className="card anim-subir p-4" style={{ animationDelay: '50ms' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-carbon-900/40">
              {c.kpis.comision} · {barbero.comision}%
            </p>
            <p className="mt-1 text-2xl font-extrabold text-oro-dark">
              <NumeroAnimado valor={comision} />
            </p>
          </div>
          <div className="card anim-subir p-4" style={{ animationDelay: '100ms' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-carbon-900/40">{c.kpis.cortes}</p>
            <p className="num mt-1 text-2xl font-extrabold">
              <NumeroAnimado valor={t.cortes} formato={formatNumero} />
            </p>
          </div>
          <div className="card anim-subir p-4" style={{ animationDelay: '150ms' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-carbon-900/40">{c.kpis.ticket}</p>
            <p className="mt-1 text-2xl font-extrabold">
              <NumeroAnimado valor={t.promedio} />
            </p>
          </div>
        </div>

        {(cortes ?? []).length === 0 ? (
          <p className="card p-6 text-center text-sm text-carbon-900/50">{c.sinDatos}</p>
        ) : (
          <>
            {/* Tendencia */}
            {serie.length > 1 && (
              <div className="card anim-subir p-4" style={{ animationDelay: '200ms' }}>
                <h3 className="mb-2 text-sm font-bold">{c.tendencia}</h3>
                <AreaChart data={serie.map((p) => p.facturado)} destacado={idxMejor} alto={90} />
              </div>
            )}

            {/* Servicios top */}
            {servs.length > 0 && (
              <div className="card anim-subir p-4" style={{ animationDelay: '250ms' }}>
                <h3 className="mb-3 text-sm font-bold">{c.servicios}</h3>
                <ul className="space-y-2.5">
                  {servs.map((s) => (
                    <li key={s.servicioNombre}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-semibold">{s.servicioNombre}</span>
                        <span className="num text-carbon-900/60">
                          {s.cortes} · <b className="text-carbon-900">{formatPesos(s.facturado)}</b>
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-carbon-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-oro-dark to-oro"
                          style={{ width: `${(s.facturado / (servs[0]?.facturado || 1)) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Clientes */}
            <div className="card anim-subir p-4" style={{ animationDelay: '300ms' }}>
              <div className="mb-3 flex items-baseline justify-between">
                <h3 className="text-sm font-bold">{c.clientes}</h3>
                <span className="text-xs font-semibold text-carbon-900/50">
                  {c.clientesUnicos(porCliente.size)}
                </span>
              </div>
              {topClientes.length === 0 ? (
                <p className="text-sm text-carbon-900/50">—</p>
              ) : (
                <>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-carbon-900/40">
                    {c.topClientes}
                  </p>
                  <ul className="divide-y divide-carbon/5">
                    {topClientes.map((cl) => (
                      <li key={cl.nombre} className="flex items-center gap-3 py-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-carbon text-sm font-bold text-oro">
                          {cl.nombre.charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{cl.nombre}</span>
                          <span className="block text-xs text-carbon-900/50">{c.visitas(cl.visitas.size)}</span>
                        </span>
                        <b className="num text-sm">{formatPesos(cl.gastado)}</b>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}
