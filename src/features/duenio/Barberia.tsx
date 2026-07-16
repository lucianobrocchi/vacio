import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { cortesEntre } from '../../db/cortes';
import { listarBarberos, COMISION_DEFAULT } from '../../db/barberos';
import { turnosDelDia } from '../../db/turnos';
import { totales, variacion, porBarbero } from '../../lib/stats';
import { rangoPeriodo, rangoAnterior, claveDia } from '../../lib/fecha';
import { formatPesos } from '../../lib/format';
import { Pantalla } from '../../components/Pantalla';
import type { Config } from '../../db/types';
import { copy } from './duenio.copy';

type Periodo = 'hoy' | 'semana' | 'mes';

/** Panel del dueño: facturado, comisiones y neto de la barbería. */
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
  const varFact = variacion(t.facturado, tAnt.facturado);

  const barberoDe = (uuid: string) => barberos.find((b) => b.uuid === uuid);
  const comisionDe = (uuid: string) => barberoDe(uuid)?.comision ?? COMISION_DEFAULT;

  // Ranking con comisión calculada por barbero.
  const filas = porBarbero(cortes ?? []).map((r) => {
    const pct = comisionDe(r.barberoUuid);
    const comision = Math.round((r.facturado * pct) / 100);
    return { ...r, pct, comision, neto: r.facturado - comision };
  });
  const maxFact = filas[0]?.facturado || 1;
  const comisionesTotal = filas.reduce((a, f) => a + f.comision, 0);
  const netoLocal = t.facturado - comisionesTotal;

  const nombreDe = (uuid: string) => {
    const b = barberoDe(uuid);
    return b ? `${b.emoji ? `${b.emoji} ` : ''}${b.nombre}` : '—';
  };

  const turnosActivos = turnosHoy.filter((x) => x.estado === 'pendiente' || x.estado === 'confirmado');

  return (
    <Pantalla titulo={copy.titulo} subtitulo={config.nombreBarberia}>
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

      {/* Hero: facturado del local */}
      <div className="mb-3 rounded-3xl bg-gradient-to-br from-carbon-700 to-carbon-900 p-5 text-white shadow-card">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-oro">{copy.facturadoTotal}</p>
          {varFact != null && (
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                varFact >= 0 ? 'bg-ok/20 text-emerald-300' : 'bg-rojo/20 text-red-300'
              }`}
            >
              {varFact >= 0 ? '▲' : '▼'} {copy.vsAnterior(varFact)}
            </span>
          )}
        </div>
        <p className="num mt-1 text-[2.6rem] font-extrabold leading-none">{formatPesos(t.facturado)}</p>
        <p className="num mt-1 text-sm text-white/60">
          {t.cortes} {copy.resumen.cortes.toLowerCase()}
        </p>
      </div>

      {/* Comisiones vs neto */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-carbon-900/40">
            {copy.resumen.comisiones}
          </p>
          <p className="num mt-1 text-2xl font-extrabold text-oro-dark">{formatPesos(comisionesTotal)}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-carbon-900/40">
            {copy.resumen.neto}
          </p>
          <p className="num mt-1 text-2xl font-extrabold text-ok">{formatPesos(netoLocal)}</p>
        </div>
      </div>

      {/* Detalle por barbero */}
      <div className="card mb-4 p-4">
        <h3 className="mb-1 font-bold">{copy.porBarbero}</h3>
        {filas.length === 0 ? (
          <p className="py-3 text-sm text-carbon-900/50">{copy.vacio}</p>
        ) : (
          <ul className="divide-y divide-carbon/5">
            {filas.map((f) => (
              <li key={f.barberoUuid} className="py-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="font-semibold">{nombreDe(f.barberoUuid)}</span>
                  <span className="rounded-full bg-carbon-100 px-2 py-0.5 text-[11px] font-bold text-carbon-900/60">
                    {f.pct}% · {f.cortes} cortes
                  </span>
                </div>
                <div className="mb-2 h-2 overflow-hidden rounded-full bg-carbon-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-oro-dark to-oro"
                    style={{ width: `${(f.facturado / maxFact) * 100}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-1 text-center">
                  <Celda label={copy.col.factura} valor={formatPesos(f.facturado)} />
                  <Celda label={copy.col.comision} valor={formatPesos(f.comision)} tono="text-oro-dark" />
                  <Celda label={copy.col.neto} valor={formatPesos(f.neto)} tono="text-ok" />
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-carbon-900/40">{copy.tipComision}</p>
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

function Celda({ label, valor, tono = 'text-carbon-900' }: { label: string; valor: string; tono?: string }) {
  return (
    <div className="rounded-xl bg-carbon-50 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-carbon-900/40">{label}</p>
      <p className={`num text-sm font-bold ${tono}`}>{valor}</p>
    </div>
  );
}
