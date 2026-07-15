import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { cortesEntre } from '../../db/cortes';
import { listarBarberos } from '../../db/barberos';
import { turnosDelDia } from '../../db/turnos';
import { totales, variacion, porBarbero } from '../../lib/stats';
import { rangoPeriodo, rangoAnterior, claveDia } from '../../lib/fecha';
import { formatPesos } from '../../lib/format';
import { Pantalla } from '../../components/Pantalla';
import type { Config } from '../../db/types';
import { copy } from './duenio.copy';

type Periodo = 'hoy' | 'semana' | 'mes';

/** Panel del dueño: los números de toda la barbería, barbero por barbero. */
export function Barberia({ config }: { config: Config }) {
  const [periodo, setPeriodo] = useState<Periodo>('semana');

  const barberos = useLiveQuery(() => listarBarberos(true), []) ?? [];
  const [desde, hasta] = rangoPeriodo(periodo);
  const [desdeAnt, hastaAnt] = rangoAnterior(periodo);

  const cortes = useLiveQuery(() => cortesEntre(desde, hasta), [desde, hasta]);
  const cortesAnt = useLiveQuery(() => cortesEntre(desdeAnt, hastaAnt), [desdeAnt, hastaAnt]);
  const turnosHoy = useLiveQuery(() => turnosDelDia(claveDia()), []) ?? [];

  const t = totales(cortes ?? []);
  const tAnt = totales(cortesAnt ?? []);
  const varFacturado = variacion(t.facturado, tAnt.facturado);
  const ranking = porBarbero(cortes ?? []);
  const maxFacturado = ranking[0]?.facturado || 1;

  const nombreDe = (uuid: string) => {
    const b = barberos.find((x) => x.uuid === uuid);
    return b ? `${b.emoji ? `${b.emoji} ` : ''}${b.nombre}` : '—';
  };

  const turnosActivos = turnosHoy.filter((x) => x.estado === 'pendiente' || x.estado === 'confirmado');

  return (
    <Pantalla titulo={copy.titulo} subtitulo={config.nombreBarberia}>
      {/* Selector de período */}
      <div className="card mb-4 flex p-1">
        {(Object.keys(copy.periodos) as Periodo[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriodo(p)}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
              periodo === p ? 'bg-carbon text-white' : 'text-carbon-900/50'
            }`}
          >
            {copy.periodos[p]}
          </button>
        ))}
      </div>

      {/* Total de la barbería */}
      <div className="card mb-4 bg-carbon p-5 text-white">
        <p className="text-sm font-semibold text-white/60">{copy.kpis.facturado}</p>
        <p className="num text-4xl font-extrabold">{formatPesos(t.facturado)}</p>
        <div className="mt-1 flex items-center gap-3 text-sm text-white/70">
          <span className="num">
            {t.cortes} {copy.kpis.cortes.toLowerCase()}
          </span>
          {varFacturado != null && (
            <span className={`font-semibold ${varFacturado >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {copy.vsAnterior(varFacturado)}
            </span>
          )}
        </div>
      </div>

      {/* Ranking por barbero */}
      <div className="card mb-4 p-4">
        <h3 className="mb-3 font-bold">{copy.porBarbero}</h3>
        {ranking.length === 0 ? (
          <p className="text-sm text-carbon-900/50">{copy.vacio}</p>
        ) : (
          <ul className="space-y-3">
            {ranking.map((r) => (
              <li key={r.barberoUuid}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-semibold">{nombreDe(r.barberoUuid)}</span>
                  <span className="num text-carbon-900/60">
                    {r.cortes} · <b className="text-carbon-900">{formatPesos(r.facturado)}</b>
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-carbon-100">
                  <div
                    className="h-full rounded-full bg-oro"
                    style={{ width: `${(r.facturado / maxFacturado) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Turnos de hoy de todo el equipo */}
      <div className="card mb-4 p-4">
        <h3 className="mb-3 font-bold">{copy.turnosHoy}</h3>
        {turnosActivos.length === 0 ? (
          <p className="text-sm text-carbon-900/50">{copy.sinTurnosHoy}</p>
        ) : (
          <ul className="space-y-2">
            {turnosActivos.map((turno) => (
              <li key={turno.uuid} className="flex items-center gap-3 text-sm">
                <span className="num w-12 shrink-0 font-bold">{turno.hora}</span>
                <span className="min-w-0 flex-1 truncate">
                  {turno.clienteNombre} · {turno.servicioNombre}
                </span>
                <span className="shrink-0 text-carbon-900/50">{nombreDe(turno.barberoUuid)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Pantalla>
  );
}
