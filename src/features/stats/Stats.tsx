import { useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { cortesEntre } from '../../db/cortes';
import { listarBarberos } from '../../db/barberos';
import { listarServicios } from '../../db/servicios';
import {
  totales,
  variacion,
  porDia,
  porServicio,
  porHora,
  mejorDia,
  diasTranscurridos,
} from '../../lib/stats';
import { rangoPeriodo, rangoAnterior, formatFechaLarga, desdeClave, formatDiaCorto } from '../../lib/fecha';
import { formatPesos, formatNumero } from '../../lib/format';
import { Pantalla } from '../../components/Pantalla';
import { BarberoChips } from '../../components/BarberoChips';
import { NumeroAnimado } from '../../components/NumeroAnimado';
import { AreaChart } from './graficos/AreaChart';
import { Donut } from './graficos/Donut';
import type { Config } from '../../db/types';
import { copy } from './stats.copy';

type Periodo = 'hoy' | 'semana' | 'mes';

export function Stats({ config }: { config: Config }) {
  const [periodo, setPeriodo] = useState<Periodo>('semana');
  const [barberoUuid, setBarberoUuid] = useState(config.barberoActivoUuid);

  const barberos = useLiveQuery(() => listarBarberos(), []) ?? [];
  const servicios = useLiveQuery(() => listarServicios(true), []) ?? [];
  const emojiDe = (nombre: string) => servicios.find((s) => s.nombre === nombre)?.emoji ?? '✂️';

  const [desde, hasta] = rangoPeriodo(periodo);
  const [desdeAnt, hastaAnt] = rangoAnterior(periodo);

  // Un barbero ve solo sus estadísticas. El dueño puede mirar las de cualquiera.
  const viendo = config.esDuenio ? barberoUuid : config.barberoActivoUuid;
  const cortes = useLiveQuery(() => cortesEntre(desde, hasta, viendo), [desde, hasta, viendo]);
  const cortesAnt = useLiveQuery(
    () => cortesEntre(desdeAnt, hastaAnt, viendo),
    [desdeAnt, hastaAnt, viendo],
  );

  const t = totales(cortes ?? []);
  const tAnt = totales(cortesAnt ?? []);
  const varFact = variacion(t.facturado, tAnt.facturado);

  const serie = porDia(cortes ?? [], desde, hasta);
  const mejor = mejorDia(serie);
  const idxMejor = mejor ? serie.findIndex((p) => p.dia === mejor.dia) : undefined;
  const servs = porServicio(cortes ?? []);
  const horas = porHora(cortes ?? []).filter((h) => h.hora >= 8 && h.hora <= 22);
  const maxHora = Math.max(...horas.map((h) => h.cortes), 1);
  const horaPico = horas.reduce((m, h) => (h.cortes > m.cortes ? h : m), horas[0] ?? { hora: 0, cortes: 0 });
  const dias = Math.max(diasTranscurridos(desde, hasta), 1);
  const clientesUnicos = new Set(
    (cortes ?? []).filter((c) => c.clienteNombre?.trim()).map((c) => c.clienteNombre!.trim().toLowerCase()),
  ).size;
  // Proyección del mes: lo hecho hasta hoy estirado al mes completo.
  const proyeccion = periodo === 'mes' && dias > 0 ? (t.facturado / dias) * serie.length : null;

  const vsLabel = periodo === 'hoy' ? copy.hero.vsHoy : periodo === 'semana' ? copy.hero.vsSemana : copy.hero.vsMes;
  const hayDatos = (cortes ?? []).length > 0;

  return (
    <Pantalla titulo={copy.titulo}>
      {config.esDuenio && (
        <BarberoChips barberos={barberos} activoUuid={barberoUuid} onCambiar={setBarberoUuid} />
      )}

      {/* Selector de período */}
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

      {/* key: al cambiar período/barbero, todo re-monta y las animaciones se repiten */}
      <div key={`${periodo}-${barberoUuid}`}>
        {/* HERO: facturado + tendencia */}
        <div className="anim-subir relative mb-4 overflow-hidden rounded-3xl bg-gradient-to-br from-carbon-700 to-carbon-900 p-5 text-white shadow-card">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-oro">{copy.hero.facturado}</p>
              {varFact != null && (
                <span
                  className={`anim-despues flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                    varFact >= 0 ? 'bg-ok/20 text-emerald-300' : 'bg-rojo/20 text-red-300'
                  }`}
                >
                  {varFact >= 0 ? '▲' : '▼'} {Math.abs(Math.round(varFact))}% {vsLabel}
                </span>
              )}
            </div>
            <p className="mt-1 text-[2.6rem] font-extrabold leading-none">
              <NumeroAnimado valor={t.facturado} duracion={900} />
            </p>
            <p className="mt-1.5 text-sm text-white/60">
              {copy.hero.cortes(t.cortes)} · {copy.hero.prom} <span className="num">{formatPesos(t.promedio)}</span>
            </p>
          </div>
          {periodo !== 'hoy' && serie.length > 1 && (
            <div className="relative z-0 -mx-5 -mb-5 mt-3">
              <AreaChart data={serie.map((p) => p.facturado)} destacado={idxMejor} alto={110} />
            </div>
          )}
        </div>

        {!hayDatos ? (
          <div className="card flex flex-col items-center gap-2 p-8 text-center">
            <span className="text-4xl">📊</span>
            <p className="font-semibold">{copy.vacio.titulo}</p>
            <p className="text-sm text-carbon-900/50">{copy.vacio.bajada}</p>
          </div>
        ) : (
          <>
            {/* KPI tiles */}
            <div className="mb-4 grid grid-cols-3 gap-2.5">
              <Kpi i={0} label={copy.kpis.cortes}>
                <NumeroAnimado valor={t.cortes} formato={(n) => formatNumero(n)} />
              </Kpi>
              <Kpi i={1} label={copy.kpis.promedio}>
                <NumeroAnimado valor={t.promedio} />
              </Kpi>
              <Kpi i={2} label={copy.kpis.porDia}>
                <NumeroAnimado valor={t.facturado / dias} />
              </Kpi>
              <Kpi i={3} label={copy.kpis.clientes}>
                <NumeroAnimado valor={clientesUnicos} formato={(n) => formatNumero(n)} />
              </Kpi>
              {periodo !== 'hoy' && mejor ? (
                <Kpi i={4} label={copy.kpis.mejorDia}>
                  <span className="num">
                    {formatDiaCorto(mejor.dia)} {desdeClave(mejor.dia).getDate()}
                  </span>
                </Kpi>
              ) : (
                <Kpi i={4} label={copy.kpis.horaPico}>
                  <span className="num">{horaPico.cortes > 0 ? `${horaPico.hora} hs` : '—'}</span>
                </Kpi>
              )}
              {proyeccion != null ? (
                <Kpi i={5} label={copy.kpis.proyeccion} tono="text-oro-dark">
                  <NumeroAnimado valor={proyeccion} />
                </Kpi>
              ) : (
                <Kpi i={5} label={copy.kpis.horaPico}>
                  <span className="num">{horaPico.cortes > 0 ? `${horaPico.hora} hs` : '—'}</span>
                </Kpi>
              )}
            </div>

            {/* Actividad por día (barras) */}
            {periodo !== 'hoy' && (
              <div className="card anim-subir mb-4 p-4" style={{ animationDelay: '150ms' }}>
                <div className="mb-3 flex items-baseline justify-between">
                  <h3 className="font-bold">{copy.actividad}</h3>
                  {mejor && (
                    <span className="text-xs text-carbon-900/50">
                      {copy.kpis.mejorDia}:{' '}
                      <b className="text-carbon-900">{formatFechaLarga(mejor.dia).split(' ').slice(0, 3).join(' ')}</b>
                    </span>
                  )}
                </div>
                <BarrasDia serie={serie} idxMejor={idxMejor} />
              </div>
            )}

            {/* Medios de pago (donut) */}
            <div className="card anim-subir mb-4 flex items-center gap-5 p-4" style={{ animationDelay: '220ms' }}>
              <Donut
                tam={116}
                segmentos={[
                  { valor: t.efectivo, color: '#0F9D58' },
                  { valor: t.transferencia, color: '#2E7DD1' },
                ]}
                centro={`${t.facturado ? Math.round((t.efectivo / t.facturado) * 100) : 0}%`}
                sub="efectivo"
              />
              <div className="flex-1 space-y-3">
                <h3 className="font-bold">{copy.medios.titulo}</h3>
                <Leyenda color="#0F9D58" label={copy.medios.efectivo} monto={t.efectivo} />
                <Leyenda color="#2E7DD1" label={copy.medios.transferencia} monto={t.transferencia} />
              </div>
            </div>

            {/* Servicios más pedidos */}
            <div className="card anim-subir mb-4 p-4" style={{ animationDelay: '290ms' }}>
              <h3 className="mb-3 font-bold">{copy.servicios}</h3>
              <ul className="space-y-3">
                {servs.map((s, i) => (
                  <li key={s.servicioNombre}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-semibold">
                        {emojiDe(s.servicioNombre)} {s.servicioNombre}
                      </span>
                      <span className="num text-carbon-900/60">
                        {s.cortes} · <b className="text-carbon-900">{formatPesos(s.facturado)}</b>
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-carbon-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-oro-dark to-oro"
                        style={{
                          width: `${(s.facturado / (servs[0]?.facturado || 1)) * 100}%`,
                          transformOrigin: 'left',
                          animation: `grow-x 0.7s cubic-bezier(0.22,1,0.36,1) ${0.3 + i * 0.08}s both`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Horas pico */}
            <div className="card anim-subir mb-4 p-4" style={{ animationDelay: '360ms' }}>
              <div className="mb-3 flex items-baseline justify-between">
                <h3 className="font-bold">{copy.horasPico}</h3>
                {horaPico.cortes > 0 && (
                  <span className="num text-xs font-bold text-oro-dark">{horaPico.hora}:00 hs</span>
                )}
              </div>
              <div className="flex items-end gap-1" style={{ height: 68 }}>
                {horas.map((h, i) => (
                  <div key={h.hora} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className={`anim-barra w-full rounded-t ${
                        h.hora === horaPico.hora && h.cortes > 0
                          ? 'bg-gradient-to-t from-oro-dark to-oro'
                          : 'bg-carbon/25'
                      }`}
                      style={{
                        height: Math.max((h.cortes / maxHora) * 50, h.cortes > 0 ? 3 : 1),
                        animationDelay: `${i * 25}ms`,
                      }}
                    />
                    <span className="text-[9px] text-carbon-900/40">{h.hora % 3 === 0 ? h.hora : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Pantalla>
  );
}

function Kpi({ label, children, i, tono }: { label: string; children: ReactNode; i: number; tono?: string }) {
  return (
    <div className="card anim-subir p-3.5" style={{ animationDelay: `${60 + i * 45}ms` }}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-carbon-900/40">{label}</p>
      <p className={`mt-1 text-xl font-extrabold leading-tight ${tono ?? ''}`}>{children}</p>
    </div>
  );
}

function Leyenda({ color, label, monto }: { color: string; label: string; monto: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <b>
        <NumeroAnimado valor={monto} className="text-sm" />
      </b>
    </div>
  );
}

function BarrasDia({
  serie,
  idxMejor,
}: {
  serie: { dia: string; cortes: number; facturado: number }[];
  idxMejor?: number;
}) {
  const max = Math.max(...serie.map((p) => p.facturado), 1);
  const cadaCuanto = serie.length > 14 ? 5 : 1;
  return (
    <div className="flex items-end gap-1" style={{ height: 96 }}>
      {serie.map((p, i) => (
        <div key={p.dia} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <div
            className={`anim-barra w-full rounded-t-md ${
              i === idxMejor ? 'bg-gradient-to-t from-oro-dark to-oro' : 'bg-carbon/75'
            }`}
            style={{
              height: Math.max((p.facturado / max) * 74, p.facturado > 0 ? 4 : 1),
              animationDelay: `${Math.min(i * 30, 500)}ms`,
            }}
          />
          <span className="h-3.5 truncate text-[9px] text-carbon-900/40">
            {i % cadaCuanto === 0 ? desdeClave(p.dia).getDate() : ''}
          </span>
        </div>
      ))}
    </div>
  );
}
