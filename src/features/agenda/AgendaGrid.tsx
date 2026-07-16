import { useEffect, useRef, useState } from 'react';
import { claveDia, horaAMin, minAHora } from '../../lib/fecha';
import { formatPesos } from '../../lib/format';
import { IconoCandado } from '../../components/Iconos';
import type { Bloqueo, Config, Turno } from '../../db/types';

interface Props {
  config: Config;
  dia: string;
  turnos: Turno[];
  bloqueos: Bloqueo[];
  onNuevo: (hora: string) => void;
  onVerTurno: (turno: Turno) => void;
}

const HOUR_PX = 68; // alto de una hora en px
const GUTTER = 52; // ancho de la columna de horas

const BLOQUE_ESTADO: Record<string, { barra: string; fondo: string }> = {
  pendiente: { barra: 'bg-pendiente', fondo: 'bg-pendiente/10' },
  confirmado: { barra: 'bg-confirmado', fondo: 'bg-confirmado/10' },
  hecho: { barra: 'bg-ok', fondo: 'bg-ok/10' },
  cancelado: { barra: 'bg-cancelado', fondo: 'bg-cancelado/10' },
};

/** Grilla de horarios del día, estilo Google Calendar. */
export function AgendaGrid({ config, dia, turnos, bloqueos, onNuevo, onVerTurno }: Props) {
  const horario = config.horario[new Date(`${dia}T12:00`).getDay()];
  const paso = config.duracionTurnoDefault;

  // Rango de la grilla: horario del día, con 1h de aire antes/después.
  const abre = horario.cerrado ? 8 * 60 : Math.max(horaAMin(horario.abre) - 60, 6 * 60);
  const cierra = horario.cerrado ? 21 * 60 : Math.min(horaAMin(horario.cierra) + 60, 23 * 60);
  const pxMin = HOUR_PX / 60;
  const altura = (cierra - abre) * pxMin;

  const top = (min: number) => (min - abre) * pxMin;
  const horasLinea: number[] = [];
  for (let h = Math.ceil(abre / 60) * 60; h <= cierra; h += 60) horasLinea.push(h);

  const gridRef = useRef<HTMLDivElement>(null);

  // Línea de "ahora" (solo si el día es hoy).
  const esHoy = dia === claveDia();
  const [ahoraMin, setAhoraMin] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });
  useEffect(() => {
    if (!esHoy) return;
    const id = setInterval(() => {
      const n = new Date();
      setAhoraMin(n.getHours() * 60 + n.getMinutes());
    }, 60_000);
    return () => clearInterval(id);
  }, [esHoy]);

  // Scroll inicial cerca de la primera actividad (o del horario de apertura).
  useEffect(() => {
    const primeros = [...turnos.map((t) => horaAMin(t.hora)), horario.cerrado ? 9 * 60 : horaAMin(horario.abre)];
    const min = Math.min(...primeros);
    const el = gridRef.current;
    if (el) el.scrollTop = Math.max(top(min) - HOUR_PX, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dia]);

  function tapCrear(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const min = abre + Math.round(y / pxMin / paso) * paso;
    const clamp = Math.max(abre, Math.min(min, cierra - paso));
    onNuevo(minAHora(clamp));
  }

  const visibles = turnos.filter((t) => t.estado !== 'cancelado');

  return (
    <div
      ref={gridRef}
      className="sin-scrollbar relative overflow-y-auto rounded-2xl border border-carbon/10 bg-white"
      style={{ maxHeight: 'calc(100dvh - 20rem)' }}
    >
      <div className="relative" style={{ height: altura }}>
        {/* Capa de fondo: líneas de hora + tap para crear */}
        <div className="absolute inset-0" onClick={tapCrear}>
          {horasLinea.map((h) => (
            <div key={h} className="absolute inset-x-0 flex items-start" style={{ top: top(h) }}>
              <span className="num w-[52px] -translate-y-2 pr-2 text-right text-[11px] font-medium text-carbon-900/40">
                {minAHora(h)}
              </span>
              <div className="mt-0 flex-1 border-t border-carbon/8" />
            </div>
          ))}
        </div>

        {/* Bloqueos */}
        {bloqueos.map((b) => {
          const y = top(horaAMin(b.desde));
          const h = Math.max((horaAMin(b.hasta) - horaAMin(b.desde)) * pxMin, 20);
          return (
            <div
              key={b.uuid}
              className="absolute rounded-lg border border-dashed border-carbon/25 bg-[repeating-linear-gradient(45deg,#EAE5DC,#EAE5DC_6px,#F6F3EE_6px,#F6F3EE_12px)] px-2 py-1"
              style={{ top: y, height: h, left: GUTTER + 4, right: 8 }}
            >
              <span className="flex items-center gap-1 text-[11px] font-semibold text-carbon-900/55">
                <IconoCandado width={13} height={13} />
                {b.motivo || 'Bloqueado'}
              </span>
            </div>
          );
        })}

        {/* Turnos */}
        {visibles.map((turno) => {
          const y = top(horaAMin(turno.hora));
          const h = Math.max(turno.duracionMin * pxMin, 24);
          const est = BLOQUE_ESTADO[turno.estado] ?? BLOQUE_ESTADO.confirmado;
          const chico = h < 42;
          return (
            <button
              key={turno.uuid}
              type="button"
              onClick={() => onVerTurno(turno)}
              className={`absolute overflow-hidden rounded-lg ${est.fondo} pl-2.5 pr-2 text-left shadow-sm transition active:scale-[0.99]`}
              style={{ top: y + 1, height: h - 2, left: GUTTER + 4, right: 8 }}
            >
              <span className={`absolute inset-y-0 left-0 w-1.5 ${est.barra}`} />
              <span className={`flex ${chico ? 'items-center gap-2' : 'flex-col'} `}>
                <span className="truncate text-[13px] font-bold leading-tight text-carbon-900">
                  {turno.clienteNombre}
                </span>
                <span className="truncate text-[11px] leading-tight text-carbon-900/55">
                  {turno.hora} · {turno.servicioNombre}
                  {turno.origen === 'cliente' ? ' · 🔗' : ''}
                </span>
              </span>
              {!chico && (
                <span className="num absolute bottom-1 right-2 text-[11px] font-semibold text-carbon-900/50">
                  {formatPesos(turno.precio)}
                </span>
              )}
            </button>
          );
        })}

        {/* Línea de ahora */}
        {esHoy && ahoraMin >= abre && ahoraMin <= cierra && (
          <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: top(ahoraMin) }}>
            <span className="num w-[52px] pr-1 text-right text-[10px] font-bold text-oro-dark">
              {minAHora(ahoraMin)}
            </span>
            <span className="h-2 w-2 rounded-full bg-oro-dark" />
            <div className="h-[2px] flex-1 bg-oro-dark" />
          </div>
        )}
      </div>
    </div>
  );
}
