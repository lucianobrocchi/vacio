import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { listarServicios } from '../../db/servicios';
import { crearTurno, actualizarTurno, turnosDelDia } from '../../db/turnos';
import { bloqueosDelDia } from '../../db/bloqueos';
import { slotsLibres, horaDisponible } from '../../lib/agenda';
import { claveDia, desdeClave, formatFechaLarga, horaAMin } from '../../lib/fecha';
import { formatNumero } from '../../lib/format';
import { Sheet } from '../../components/Sheet';
import { Campo } from '../../components/Campo';
import type { Config, Turno } from '../../db/types';
import { copy } from './agenda.copy';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  config: Config;
  dia: string;
  barberoUuid: string;
  /** Si viene, es edición. */
  turno?: Turno;
}

const c = copy.turnoSheet;

export function TurnoSheet({ abierto, onCerrar, config, dia, barberoUuid, turno }: Props) {
  const servicios = useLiveQuery(() => listarServicios(), []) ?? [];
  const turnos = useLiveQuery(() => turnosDelDia(dia, barberoUuid), [dia, barberoUuid]) ?? [];
  const bloqueos = useLiveQuery(() => bloqueosDelDia(dia, barberoUuid), [dia, barberoUuid]) ?? [];

  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [servicioUuid, setServicioUuid] = useState('');
  const [hora, setHora] = useState('');
  const [nota, setNota] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!abierto) return;
    setError('');
    if (turno) {
      setClienteNombre(turno.clienteNombre);
      setClienteTelefono(turno.clienteTelefono ?? '');
      setClienteEmail(turno.clienteEmail ?? '');
      setServicioUuid(turno.servicioUuid);
      setHora(turno.hora);
      setNota(turno.nota ?? '');
    } else {
      setClienteNombre('');
      setClienteTelefono('');
      setClienteEmail('');
      setServicioUuid('');
      setHora('');
      setNota('');
    }
  }, [abierto, turno]);

  const servicioElegido = useMemo(
    () => servicios.find((s) => s.uuid === servicioUuid),
    [servicios, servicioUuid],
  );

  // Slots libres para el servicio elegido (excluyendo al propio turno al editar).
  const horasLibres = useMemo(() => {
    if (!servicioElegido) return [];
    const esHoy = dia === claveDia();
    const ahora = new Date();
    const horario = config.horario[desdeClave(dia).getDay()];
    const otrosTurnos = turno ? turnos.filter((t) => t.uuid !== turno.uuid) : turnos;
    const libres = slotsLibres({
      horario,
      turnos: otrosTurnos,
      bloqueos,
      duracionMin: servicioElegido.duracionMin,
      paso: config.duracionTurnoDefault,
      ahoraMin: esHoy ? ahora.getHours() * 60 + ahora.getMinutes() : null,
    }).map((s) => s.hora);
    // Al editar, la hora actual del turno sigue siendo elegible.
    if (turno && !libres.includes(turno.hora)) {
      return [turno.hora, ...libres].sort((a, b) => horaAMin(a) - horaAMin(b));
    }
    return libres;
  }, [servicioElegido, dia, config, turnos, bloqueos, turno]);

  // Si el servicio cambió y la hora elegida ya no sirve, deselecciona.
  useEffect(() => {
    if (hora && !horasLibres.includes(hora)) setHora('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horasLibres]);

  async function guardar() {
    if (!servicioElegido || !hora || !clienteNombre.trim()) return;
    const otrosTurnos = turno ? turnos.filter((t) => t.uuid !== turno.uuid) : turnos;
    if (!horaDisponible(hora, servicioElegido.duracionMin, otrosTurnos, bloqueos)) {
      setError(c.horaOcupada);
      return;
    }
    const datos = {
      dia,
      hora,
      duracionMin: servicioElegido.duracionMin,
      barberoUuid,
      servicioUuid: servicioElegido.uuid,
      servicioNombre: servicioElegido.nombre,
      precio: servicioElegido.precio,
      clienteNombre: clienteNombre.trim(),
      clienteTelefono: clienteTelefono.trim() || undefined,
      clienteEmail: clienteEmail.trim() || undefined,
      nota: nota.trim() || undefined,
    };
    if (turno) await actualizarTurno(turno.uuid, datos);
    else await crearTurno({ ...datos, origen: 'barbero' });
    onCerrar();
  }

  return (
    <Sheet
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={turno ? c.tituloEditar : `${c.tituloNuevo} · ${formatFechaLarga(dia)}`}
    >
      <div className="space-y-4">
        <Campo label={c.cliente}>
          <input
            className="input-texto"
            value={clienteNombre}
            onChange={(e) => setClienteNombre(e.target.value)}
            placeholder={c.clientePlaceholder}
          />
        </Campo>

        <div className="grid grid-cols-2 gap-3">
          <Campo label={c.telefono}>
            <input
              className="input-texto num"
              inputMode="tel"
              value={clienteTelefono}
              onChange={(e) => setClienteTelefono(e.target.value)}
              placeholder={c.telefonoPlaceholder}
            />
          </Campo>
          <Campo label={c.email}>
            <input
              className="input-texto"
              inputMode="email"
              value={clienteEmail}
              onChange={(e) => setClienteEmail(e.target.value)}
              placeholder={c.emailPlaceholder}
            />
          </Campo>
        </div>

        <Campo label={c.servicio}>
          <div className="grid grid-cols-2 gap-2">
            {servicios.map((s) => {
              const activo = s.uuid === servicioUuid;
              return (
                <button
                  key={s.uuid}
                  type="button"
                  onClick={() => setServicioUuid(s.uuid)}
                  className={`rounded-2xl border-2 p-3 text-left transition ${
                    activo ? 'border-carbon bg-carbon text-white' : 'border-carbon/15 bg-white'
                  }`}
                >
                  <span className="block truncate text-sm font-semibold">
                    {s.emoji} {s.nombre}
                  </span>
                  <span className={`num block text-sm ${activo ? 'text-white/70' : 'text-carbon-900/50'}`}>
                    $ {formatNumero(s.precio)} · {s.duracionMin} min
                  </span>
                </button>
              );
            })}
          </div>
        </Campo>

        {servicioElegido && (
          <Campo label={c.hora}>
            {horasLibres.length === 0 ? (
              <p className="text-sm text-carbon-900/50">{c.sinHorarios}</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {horasLibres.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHora(h)}
                    className={`num rounded-xl border-2 py-2.5 text-sm font-semibold transition ${
                      hora === h ? 'border-carbon bg-carbon text-white' : 'border-carbon/15 bg-white'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            )}
          </Campo>
        )}

        <Campo label={c.nota}>
          <input
            className="input-texto"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder={c.notaPlaceholder}
          />
        </Campo>

        {error && <p className="text-sm font-semibold text-rojo">{error}</p>}

        <button
          type="button"
          className="btn-primario"
          disabled={!servicioElegido || !hora || !clienteNombre.trim()}
          onClick={guardar}
        >
          {turno ? c.guardarCambios : c.guardar}
        </button>
      </div>
    </Sheet>
  );
}
