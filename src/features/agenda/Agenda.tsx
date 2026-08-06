import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { listarBarberos } from '../../db/barberos';
import { turnosDelDia } from '../../db/turnos';
import { bloqueosDelDia, borrarBloqueo } from '../../db/bloqueos';
import { claveDia, desdeClave, formatFechaLarga } from '../../lib/fecha';
import { formatPesos } from '../../lib/format';
import { Pantalla } from '../../components/Pantalla';
import { BarberoChips } from '../../components/BarberoChips';
import { IconoCandado, IconoCalendario, IconoMas, IconoTacho } from '../../components/Iconos';
import { TiraDias } from './TiraDias';
import { AgendaGrid } from './AgendaGrid';
import { TurnoSheet } from './TurnoSheet';
import { BloqueoSheet } from './BloqueoSheet';
import { TurnoDetalle } from './TurnoDetalle';
import type { Config, Turno } from '../../db/types';
import { copy } from './agenda.copy';

type Vista = 'calendario' | 'lista';

const COLORES_BORDE: Record<string, string> = {
  pendiente: 'border-l-pendiente',
  confirmado: 'border-l-confirmado',
  hecho: 'border-l-ok',
  cancelado: 'border-l-cancelado',
};

export function Agenda({ config }: { config: Config }) {
  const [dia, setDia] = useState(claveDia());
  const [barberoUuid, setBarberoUuid] = useState(config.barberoActivoUuid);
  const [vista, setVista] = useState<Vista>('calendario');
  const [turnoSheet, setTurnoSheet] = useState(false);
  const [bloqueoSheet, setBloqueoSheet] = useState(false);
  const [turnoDetalle, setTurnoDetalle] = useState<Turno | null>(null);
  const [turnoEditando, setTurnoEditando] = useState<Turno | undefined>();
  const [horaInicial, setHoraInicial] = useState<string | undefined>();

  const barberos = useLiveQuery(() => listarBarberos(), []) ?? [];
  // Un barbero ve solo su agenda. El dueño puede mirar la de cualquiera.
  const viendo = config.esDuenio ? barberoUuid : config.barberoActivoUuid;
  const turnos = useLiveQuery(() => turnosDelDia(dia, viendo), [dia, viendo]);
  const bloqueos = useLiveQuery(() => bloqueosDelDia(dia, viendo), [dia, viendo]) ?? [];

  const horario = config.horario[desdeClave(dia).getDay()];
  const visibles = (turnos ?? []).filter((t) => t.estado !== 'cancelado');

  const items = [
    ...visibles.map((t) => ({ tipo: 'turno' as const, hora: t.hora, turno: t })),
    ...bloqueos.map((b) => ({ tipo: 'bloqueo' as const, hora: b.desde, bloqueo: b })),
  ].sort((a, b) => a.hora.localeCompare(b.hora));

  function abrirNuevoTurno(hora?: string) {
    setTurnoEditando(undefined);
    setHoraInicial(hora);
    setTurnoSheet(true);
  }

  function editarTurno(turno: Turno) {
    setTurnoDetalle(null);
    setTurnoEditando(turno);
    setHoraInicial(undefined);
    setTurnoSheet(true);
  }

  return (
    <Pantalla titulo={copy.titulo} subtitulo={formatFechaLarga(dia)}>
      {config.esDuenio && (
        <BarberoChips barberos={barberos} activoUuid={barberoUuid} onCambiar={setBarberoUuid} />
      )}
      <TiraDias dia={dia} onCambiar={setDia} />

      <div className="mb-4 flex items-center gap-3">
        <button type="button" className="btn-primario flex-1 py-3 text-base" onClick={() => abrirNuevoTurno()}>
          <IconoMas width={20} height={20} />
          {copy.nuevoTurno}
        </button>
        <button
          type="button"
          className="btn-secundario flex-1 py-3 text-base"
          onClick={() => setBloqueoSheet(true)}
        >
          <IconoCandado width={20} height={20} />
          {copy.bloquear}
        </button>
      </div>

      {/* Toggle de vista */}
      <div className="mb-3 flex justify-end">
        <div className="flex rounded-xl bg-carbon-100 p-0.5 text-sm font-semibold">
          {(['calendario', 'lista'] as Vista[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVista(v)}
              className={`rounded-lg px-3 py-1.5 transition ${
                vista === v ? 'bg-white text-carbon shadow-card' : 'text-carbon-900/50'
              }`}
            >
              {v === 'calendario' ? 'Calendario' : 'Lista'}
            </button>
          ))}
        </div>
      </div>

      {horario.cerrado && vista === 'lista' && (
        <div className="card mb-4 border-l-4 border-l-pendiente p-4 text-sm text-carbon-900/70">
          {copy.cerrado}
        </div>
      )}

      {vista === 'calendario' ? (
        <AgendaGrid
          config={config}
          dia={dia}
          turnos={turnos ?? []}
          bloqueos={bloqueos}
          onNuevo={(hora) => abrirNuevoTurno(hora)}
          onVerTurno={(t) => setTurnoDetalle(t)}
        />
      ) : (
        <>
          {items.length === 0 && !horario.cerrado && (
            <div className="card flex flex-col items-center gap-2 p-8 text-center">
              <IconoCalendario width={36} height={36} className="text-carbon-900/25" />
              <p className="font-semibold">{copy.vacio.titulo}</p>
              <p className="text-sm text-carbon-900/50">{copy.vacio.bajada}</p>
            </div>
          )}
          <ul className="space-y-2">
            {items.map((item) =>
              item.tipo === 'turno' ? (
                <li key={item.turno.uuid}>
                  <button
                    type="button"
                    onClick={() => setTurnoDetalle(item.turno)}
                    className={`card flex w-full items-center gap-3 border-l-4 p-4 text-left transition active:scale-[0.99] ${COLORES_BORDE[item.turno.estado]}`}
                  >
                    <span className="num w-14 shrink-0">
                      <span className="block text-lg font-bold">{item.turno.hora}</span>
                      <span className="block text-xs text-carbon-900/40">{item.turno.duracionMin} min</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{item.turno.clienteNombre}</span>
                      <span className="block truncate text-sm text-carbon-900/50">
                        {item.turno.servicioNombre}
                        {item.turno.origen === 'cliente' ? ' · 🔗' : ''}
                      </span>
                    </span>
                    <span className="num shrink-0 font-bold">{formatPesos(item.turno.precio)}</span>
                  </button>
                </li>
              ) : (
                <li key={item.bloqueo.uuid}>
                  <div className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-carbon/20 bg-carbon-100/60 p-4">
                    <IconoCandado width={22} height={22} className="shrink-0 text-carbon-900/50" />
                    <span className="min-w-0 flex-1">
                      <span className="num block font-semibold text-carbon-900/70">
                        {item.bloqueo.desde} – {item.bloqueo.hasta}
                      </span>
                      {item.bloqueo.motivo && (
                        <span className="block truncate text-sm text-carbon-900/50">{item.bloqueo.motivo}</span>
                      )}
                    </span>
                    <button
                      type="button"
                      aria-label={copy.bloqueoSheet.borrar}
                      className="shrink-0 rounded-full p-2 text-carbon-900/40 transition active:bg-carbon-100"
                      onClick={() => borrarBloqueo(item.bloqueo.uuid)}
                    >
                      <IconoTacho width={20} height={20} />
                    </button>
                  </div>
                </li>
              ),
            )}
          </ul>
        </>
      )}

      <TurnoSheet
        abierto={turnoSheet}
        onCerrar={() => setTurnoSheet(false)}
        config={config}
        dia={dia}
        barberoUuid={viendo}
        turno={turnoEditando}
        horaInicial={horaInicial}
      />
      <BloqueoSheet
        abierto={bloqueoSheet}
        onCerrar={() => setBloqueoSheet(false)}
        config={config}
        dia={dia}
        barberoUuid={viendo}
      />
      {turnoDetalle && (
        <TurnoDetalle
          turno={turnoDetalle}
          onCerrar={() => setTurnoDetalle(null)}
          onEditar={editarTurno}
          config={config}
        />
      )}
    </Pantalla>
  );
}
