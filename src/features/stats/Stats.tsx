import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { cortesEntre } from '../../db/cortes';
import { listarBarberos } from '../../db/barberos';
import {
  totales,
  variacion,
  porDia,
  porServicio,
  porHora,
  mejorDia,
  diasTranscurridos,
} from '../../lib/stats';
import { rangoPeriodo, rangoAnterior, formatFechaLarga, desdeClave } from '../../lib/fecha';
import { formatPesos } from '../../lib/format';
import { Pantalla } from '../../components/Pantalla';
import { BarberoChips } from '../../components/BarberoChips';
import { GraficoBarras } from './GraficoBarras';
import type { Config } from '../../db/types';
import { copy } from './stats.copy';

type Periodo = 'hoy' | 'semana' | 'mes';

export function Stats({ config }: { config: Config }) {
  const [periodo, setPeriodo] = useState<Periodo>('semana');
  const [barberoUuid, setBarberoUuid] = useState(config.barberoActivoUuid);

  const barberos = useLiveQuery(() => listarBarberos(), []) ?? [];

  const [desde, hasta] = rangoPeriodo(periodo);
  const [desdeAnt, hastaAnt] = rangoAnterior(periodo);

  const cortes = useLiveQuery(
    () => cortesEntre(desde, hasta, barberoUuid),
    [desde, hasta, barberoUuid],
  );
  const cortesAnt = useLiveQuery(
    () => cortesEntre(desdeAnt, hastaAnt, barberoUuid),
    [desdeAnt, hastaAnt, barberoUuid],
  );

  const t = totales(cortes ?? []);
  const tAnt = totales(cortesAnt ?? []);
  const varFacturado = variacion(t.facturado, tAnt.facturado);

  const serie = porDia(cortes ?? [], desde, hasta);
  const mejor = mejorDia(serie);
  const servicios = porServicio(cortes ?? []);
  const horas = porHora(cortes ?? []).filter((h) => h.hora >= 8 && h.hora <= 22);
  const maxHora = Math.max(...horas.map((h) => h.cortes), 1);
  const dias = Math.max(diasTranscurridos(desde, hasta), 1);

  return (
    <Pantalla titulo={copy.titulo}>
      <BarberoChips barberos={barberos} activoUuid={barberoUuid} onCambiar={setBarberoUuid} />

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

      {/* KPIs */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-sm font-semibold text-carbon-900/50">{copy.kpis.facturado}</p>
          <p className="num text-2xl font-extrabold">{formatPesos(t.facturado)}</p>
          {varFacturado != null && (
            <p className={`text-xs font-semibold ${varFacturado >= 0 ? 'text-ok' : 'text-rojo'}`}>
              {copy.vsAnterior(varFacturado)}
            </p>
          )}
        </div>
        <div className="card p-4">
          <p className="text-sm font-semibold text-carbon-900/50">{copy.kpis.cortes}</p>
          <p className="num text-2xl font-extrabold">{t.cortes}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm font-semibold text-carbon-900/50">{copy.kpis.promedio}</p>
          <p className="num text-2xl font-extrabold">{formatPesos(t.promedio)}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm font-semibold text-carbon-900/50">{copy.kpis.porDia}</p>
          <p className="num text-2xl font-extrabold">{formatPesos(t.facturado / dias)}</p>
        </div>
      </div>

      {(cortes ?? []).length === 0 ? (
        <div className="card p-6 text-center text-sm text-carbon-900/50">{copy.vacio}</div>
      ) : (
        <>
          {/* Cortes por día */}
          {periodo !== 'hoy' && (
            <div className="card mb-4 p-4">
              <div className="mb-3 flex items-baseline justify-between">
                <h3 className="font-bold">{copy.graficoDias}</h3>
                {mejor && (
                  <span className="text-xs text-carbon-900/50">
                    {copy.mejorDia}: <b>{formatFechaLarga(mejor.dia).split(' ')[0]}</b> ·{' '}
                    {formatPesos(mejor.facturado)}
                  </span>
                )}
              </div>
              <GraficoBarras
                barras={serie.map((p) => ({
                  etiqueta: String(desdeClave(p.dia).getDate()),
                  valor: p.cortes,
                  destacada: mejor?.dia === p.dia,
                }))}
              />
            </div>
          )}

          {/* Medios de pago */}
          <div className="card mb-4 p-4">
            <h3 className="mb-3 font-bold">{copy.medios.titulo}</h3>
            <div className="mb-2 flex h-3 overflow-hidden rounded-full bg-carbon-100">
              <div
                className="bg-ok"
                style={{ width: `${t.facturado ? (t.efectivo / t.facturado) * 100 : 0}%` }}
              />
              <div className="flex-1 bg-confirmado" />
            </div>
            <div className="flex justify-between text-sm">
              <span>
                <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-ok" />
                {copy.medios.efectivo} <b className="num">{formatPesos(t.efectivo)}</b>
              </span>
              <span>
                <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-confirmado" />
                {copy.medios.transferencia} <b className="num">{formatPesos(t.transferencia)}</b>
              </span>
            </div>
          </div>

          {/* Ranking de servicios */}
          <div className="card mb-4 p-4">
            <h3 className="mb-3 font-bold">{copy.servicios}</h3>
            <ul className="space-y-2.5">
              {servicios.map((s) => (
                <li key={s.servicioNombre}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-semibold">{s.servicioNombre}</span>
                    <span className="num text-carbon-900/60">
                      {s.cortes} · {formatPesos(s.facturado)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-carbon-100">
                    <div
                      className="h-full rounded-full bg-oro"
                      style={{ width: `${(s.facturado / (servicios[0]?.facturado || 1)) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Horas pico */}
          <div className="card mb-4 p-4">
            <h3 className="mb-3 font-bold">{copy.horasPico}</h3>
            <div className="flex items-end gap-1" style={{ height: 72 }}>
              {horas.map((h) => (
                <div key={h.hora} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t-md ${h.cortes === maxHora ? 'bg-oro' : 'bg-carbon/60'}`}
                    style={{ height: Math.max((h.cortes / maxHora) * 50, h.cortes > 0 ? 3 : 1) }}
                  />
                  <span className="text-[9px] text-carbon-900/40">
                    {h.hora % 3 === 0 ? h.hora : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </Pantalla>
  );
}
