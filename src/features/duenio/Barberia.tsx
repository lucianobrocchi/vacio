import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { cortesEntre } from '../../db/cortes';
import { listarBarberos, COMISION_DEFAULT } from '../../db/barberos';
import { turnosDelDia } from '../../db/turnos';
import { ventasEntre } from '../../db/ventas';
import { totales, variacion, porBarbero, totalesVentas, ventasPorBarbero } from '../../lib/stats';
import { rangoPeriodo, rangoAnterior, claveDia } from '../../lib/fecha';
import { formatPesos } from '../../lib/format';
import { Pantalla } from '../../components/Pantalla';
import { NumeroAnimado } from '../../components/NumeroAnimado';
import { IconoFlechaDer } from '../../components/Iconos';
import { BarberoDetalle } from './BarberoDetalle';
import type { Barbero, Config } from '../../db/types';
import { copy } from './duenio.copy';

type Periodo = 'hoy' | 'semana' | 'mes';

/** Panel del dueño: facturado, comisiones y neto de la barbería. */
export function Barberia({ config }: { config: Config }) {
  const [periodo, setPeriodo] = useState<Periodo>('semana');
  const [detalle, setDetalle] = useState<Barbero | null>(null);

  const barberos = useLiveQuery(() => listarBarberos(true), []) ?? [];
  const [desde, hasta] = rangoPeriodo(periodo);
  const [desdeAnt, hastaAnt] = rangoAnterior(periodo);

  const cortes = useLiveQuery(() => cortesEntre(desde, hasta), [desde, hasta]);
  const cortesAnt = useLiveQuery(() => cortesEntre(desdeAnt, hastaAnt), [desdeAnt, hastaAnt]);
  const ventas = useLiveQuery(() => ventasEntre(desde, hasta), [desde, hasta]);
  const ventasAnt = useLiveQuery(() => ventasEntre(desdeAnt, hastaAnt), [desdeAnt, hastaAnt]);
  const turnosHoy = useLiveQuery(() => turnosDelDia(claveDia()), []) ?? [];

  const t = totales(cortes ?? []);
  const tAnt = totales(cortesAnt ?? []);
  const p = totalesVentas(ventas ?? []);
  const pAnt = totalesVentas(ventasAnt ?? []);

  // Facturación total = servicios + productos.
  const facturadoTotal = t.facturado + p.facturado;
  const varFact = variacion(facturadoTotal, tAnt.facturado + pAnt.facturado);

  const barberoDe = (uuid: string) => barberos.find((b) => b.uuid === uuid);
  const comisionDe = (uuid: string) => barberoDe(uuid)?.comision ?? COMISION_DEFAULT;

  // Ranking por barbero: comisión de cortes + comisión de productos.
  const ventasDe = ventasPorBarbero(ventas ?? []);
  const filas = porBarbero(cortes ?? []).map((r) => {
    const pct = comisionDe(r.barberoUuid);
    const comisionCortes = Math.round((r.facturado * pct) / 100);
    const vp = ventasDe.get(r.barberoUuid);
    const prodFacturado = vp?.facturado ?? 0;
    const comisionProd = vp?.comisiones ?? 0;
    const comision = comisionCortes + comisionProd;
    return {
      ...r,
      pct,
      comision,
      prodFacturado,
      total: r.facturado + prodFacturado,
      neto: r.facturado + prodFacturado - comision,
    };
  });
  // Barberos que solo vendieron productos (sin cortes en el período).
  for (const [uuid, vp] of ventasDe) {
    if (filas.some((f) => f.barberoUuid === uuid)) continue;
    filas.push({
      barberoUuid: uuid,
      cortes: 0,
      facturado: 0,
      pct: comisionDe(uuid),
      comision: vp.comisiones,
      prodFacturado: vp.facturado,
      total: vp.facturado,
      neto: vp.facturado - vp.comisiones,
    });
  }
  filas.sort((a, b) => b.total - a.total);

  const maxFact = filas[0]?.total || 1;
  const comisionesTotal = filas.reduce((a, f) => a + f.comision, 0);
  const netoLocal = facturadoTotal - p.costo - comisionesTotal;
  const efectivoTotal = t.efectivo + p.efectivo;
  const transferenciaTotal = t.transferencia + p.transferencia;

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
        <p className="mt-1 text-[2.6rem] font-extrabold leading-none">
          <NumeroAnimado valor={facturadoTotal} duracion={900} />
        </p>
        <p className="num mt-1 text-sm text-white/60">
          {t.cortes} {copy.resumen.cortes.toLowerCase()} · {p.unidades}{' '}
          {copy.desglose.productos.toLowerCase()}
        </p>
      </div>

      {/* Comisiones vs neto */}
      <div className="mb-3 grid grid-cols-2 gap-3">
        <div className="card anim-subir p-4" style={{ animationDelay: '60ms' }}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-carbon-900/40">
            {copy.resumen.comisiones}
          </p>
          <p className="mt-1 text-2xl font-extrabold text-oro-dark">
            <NumeroAnimado valor={comisionesTotal} />
          </p>
        </div>
        <div className="card anim-subir p-4" style={{ animationDelay: '120ms' }}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-carbon-900/40">
            {copy.resumen.neto}
          </p>
          <p className="mt-1 text-2xl font-extrabold text-ok">
            <NumeroAnimado valor={netoLocal} />
          </p>
        </div>
      </div>

      {/* De dónde viene la plata: servicios vs productos */}
      <div className="card anim-subir mb-3 p-4" style={{ animationDelay: '160ms' }}>
        <h3 className="mb-3 font-bold">{copy.desglose.titulo}</h3>
        <Fuente
          label={copy.desglose.servicios}
          detalle={`${t.cortes} ${copy.resumen.cortes.toLowerCase()}`}
          monto={t.facturado}
          total={facturadoTotal}
          clase="from-oro-dark to-oro"
        />
        <Fuente
          label={copy.desglose.productos}
          detalle={copy.desglose.unidades(p.unidades)}
          monto={p.facturado}
          total={facturadoTotal}
          clase="from-carbon-700 to-carbon-900"
        />
      </div>

      {/* Cómo te pagaron */}
      <div className="card anim-subir mb-3 p-4" style={{ animationDelay: '200ms' }}>
        <h3 className="mb-3 font-bold">{copy.caja.titulo}</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-ok/10 p-3 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-carbon-900/45">
              {copy.caja.efectivo}
            </p>
            <p className="num mt-0.5 text-xl font-extrabold text-ok">{formatPesos(efectivoTotal)}</p>
          </div>
          <div className="rounded-2xl bg-carbon-100 p-3 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-carbon-900/45">
              {copy.caja.transferencia}
            </p>
            <p className="num mt-0.5 text-xl font-extrabold">{formatPesos(transferenciaTotal)}</p>
          </div>
        </div>
      </div>

      {/* La cuenta final, línea por línea */}
      <div className="card anim-subir mb-4 p-4" style={{ animationDelay: '240ms' }}>
        <h3 className="mb-3 font-bold">{copy.cuenta.titulo}</h3>
        <ul className="space-y-2 text-sm">
          <Linea label={copy.cuenta.bruto} monto={facturadoTotal} />
          <Linea label={copy.cuenta.costoMercaderia} monto={-p.costo} />
          <Linea label={copy.cuenta.comisiones} monto={-comisionesTotal} />
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-carbon-100 pt-3">
          <span className="font-bold">{copy.cuenta.neto}</span>
          <span className="num text-2xl font-extrabold text-ok">{formatPesos(netoLocal)}</span>
        </div>
        <p className="mt-2 text-xs text-carbon-900/45">{copy.cuenta.ayuda}</p>
      </div>

      {/* Detalle por barbero */}
      <div className="card mb-4 p-4">
        <h3 className="mb-1 font-bold">{copy.porBarbero}</h3>
        {filas.length === 0 ? (
          <p className="py-3 text-sm text-carbon-900/50">{copy.vacio}</p>
        ) : (
          <ul className="divide-y divide-carbon/5">
            {filas.map((f, i) => (
              <li key={f.barberoUuid} className="anim-subir" style={{ animationDelay: `${150 + i * 70}ms` }}>
                <button
                  type="button"
                  className="w-full py-3 text-left transition active:scale-[0.995]"
                  onClick={() => {
                    const b = barberoDe(f.barberoUuid);
                    if (b) setDetalle(b);
                  }}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1 font-semibold">
                      {nombreDe(f.barberoUuid)}
                      <IconoFlechaDer width={15} height={15} className="text-carbon-900/30" />
                    </span>
                    <span className="rounded-full bg-carbon-100 px-2 py-0.5 text-[11px] font-bold text-carbon-900/60">
                      {f.pct}% · {f.cortes} cortes
                    </span>
                  </div>
                  <div className="mb-2 h-2 overflow-hidden rounded-full bg-carbon-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-oro-dark to-oro"
                      style={{
                        width: `${(f.total / maxFact) * 100}%`,
                        transformOrigin: 'left',
                        animation: `grow-x 0.7s cubic-bezier(0.22,1,0.36,1) ${0.2 + i * 0.1}s both`,
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-center">
                    <Celda label={copy.col.factura} valor={formatPesos(f.facturado)} />
                    <Celda label={copy.colProd} valor={formatPesos(f.prodFacturado)} />
                    <Celda label={copy.col.comision} valor={formatPesos(f.comision)} tono="text-oro-dark" />
                    <Celda label={copy.col.neto} valor={formatPesos(f.neto)} tono="text-ok" />
                  </div>
                </button>
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

      {detalle && (
        <BarberoDetalle
          barbero={detalle}
          desde={desde}
          hasta={hasta}
          etiquetaPeriodo={copy.periodos[periodo]}
          onCerrar={() => setDetalle(null)}
        />
      )}
    </Pantalla>
  );
}

function Celda({ label, valor, tono = 'text-carbon-900' }: { label: string; valor: string; tono?: string }) {
  return (
    <div className="rounded-xl bg-carbon-50 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-carbon-900/40">{label}</p>
      <p className={`num text-xs font-bold ${tono}`}>{valor}</p>
    </div>
  );
}

/** Una fuente de facturación (servicios / productos) con su barra de peso. */
function Fuente({
  label,
  detalle,
  monto,
  total,
  clase,
}: {
  label: string;
  detalle: string;
  monto: number;
  total: number;
  clase: string;
}) {
  const pct = total > 0 ? Math.round((monto / total) * 100) : 0;
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm font-semibold">
          {label} <span className="text-xs font-normal text-carbon-900/45">· {detalle}</span>
        </span>
        <span className="num text-sm font-bold">{formatPesos(monto)}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-carbon-100">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${clase}`}
            style={{ width: `${pct}%`, transformOrigin: 'left', animation: 'grow-x 0.7s cubic-bezier(0.22,1,0.36,1) 0.2s both' }}
          />
        </div>
        <span className="num w-9 shrink-0 text-right text-xs font-semibold text-carbon-900/45">
          {pct}%
        </span>
      </div>
    </div>
  );
}

/** Una línea de la cuenta final (los negativos se muestran en rojo). */
function Linea({ label, monto }: { label: string; monto: number }) {
  const negativo = monto < 0;
  return (
    <li className="flex items-center justify-between">
      <span className="text-carbon-900/65">{label}</span>
      <span className={`num font-semibold ${negativo ? 'text-rojo' : ''}`}>
        {negativo ? `− ${formatPesos(-monto)}` : formatPesos(monto)}
      </span>
    </li>
  );
}
