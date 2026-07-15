import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { obtenerConfig } from '../../db/config';
import { listarBarberos } from '../../db/barberos';
import { listarServicios } from '../../db/servicios';
import { turnosDelDia, crearTurno } from '../../db/turnos';
import { bloqueosDelDia } from '../../db/bloqueos';
import { slotsLibres, horaDisponible } from '../../lib/agenda';
import { claveDia, desdeClave, formatFechaLarga } from '../../lib/fecha';
import { formatNumero } from '../../lib/format';
import { Logo } from '../../components/Logo';
import { Campo } from '../../components/Campo';
import { TiraDias } from '../agenda/TiraDias';
import type { Servicio } from '../../db/types';
import { copy } from './reservar.copy';

type Paso = 'servicio' | 'barbero' | 'diaHora' | 'datos' | 'listo';

/**
 * Página pública de reservas (#/reservar): la ve el cliente desde el link
 * de Instagram. Sin nav de la app, un paso por pantalla, cero vueltas.
 */
export function Reservar() {
  const config = useLiveQuery(() => obtenerConfig());
  const barberos = useLiveQuery(() => listarBarberos(), []) ?? [];
  const servicios = useLiveQuery(() => listarServicios(), []) ?? [];

  const [paso, setPaso] = useState<Paso>('servicio');
  const [servicio, setServicio] = useState<Servicio | null>(null);
  const [barberoUuid, setBarberoUuid] = useState('');
  const [dia, setDia] = useState(claveDia());
  const [hora, setHora] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const turnos = useLiveQuery(() => turnosDelDia(dia, barberoUuid || undefined), [dia, barberoUuid]) ?? [];
  const bloqueos =
    useLiveQuery(() => bloqueosDelDia(dia, barberoUuid || undefined), [dia, barberoUuid]) ?? [];

  const horario = config?.horario[desdeClave(dia).getDay()];

  const horas = useMemo(() => {
    if (!config || !servicio || !horario) return [];
    const esHoy = dia === claveDia();
    const ahora = new Date();
    return slotsLibres({
      horario,
      turnos,
      bloqueos,
      duracionMin: servicio.duracionMin,
      paso: config.duracionTurnoDefault,
      ahoraMin: esHoy ? ahora.getHours() * 60 + ahora.getMinutes() : null,
    }).map((s) => s.hora);
  }, [config, servicio, horario, dia, turnos, bloqueos]);

  if (!config) return null;

  async function confirmar() {
    if (!servicio || !hora || !nombre.trim() || !telefono.trim() || guardando) return;
    const elegido = barberoUuid || barberos[0]?.uuid;
    if (!elegido) return;
    if (!horaDisponible(hora, servicio.duracionMin, turnos, bloqueos)) {
      setError(copy.sinHorarios);
      setPaso('diaHora');
      setHora('');
      return;
    }
    setGuardando(true);
    await crearTurno({
      dia,
      hora,
      duracionMin: servicio.duracionMin,
      barberoUuid: elegido,
      servicioUuid: servicio.uuid,
      servicioNombre: servicio.nombre,
      precio: servicio.precio,
      clienteNombre: nombre,
      clienteTelefono: telefono.trim(),
      clienteEmail: email.trim() || undefined,
      origen: 'cliente',
    });
    setGuardando(false);
    setPaso('listo');
  }

  function reiniciar() {
    setPaso('servicio');
    setServicio(null);
    setHora('');
    setNombre('');
    setTelefono('');
    setEmail('');
    setError('');
  }

  const btnOpcion = (activo: boolean) =>
    `w-full rounded-2xl border-2 p-4 text-left transition active:scale-[0.99] ${
      activo ? 'border-carbon bg-carbon text-white' : 'border-carbon/15 bg-white'
    }`;

  return (
    <div className="safe-top mx-auto min-h-full w-full max-w-md px-5 pb-10">
      <header className="flex flex-col items-center gap-2 py-8 text-center">
        <Logo chico />
        <h1 className="text-2xl font-extrabold">{config.nombreBarberia}</h1>
        <p className="text-carbon-900/60">{copy.titulo}</p>
      </header>

      {paso === 'servicio' && (
        <section className="animate-pop space-y-2.5">
          <h2 className="mb-3 text-lg font-bold">{copy.pasos.servicio}</h2>
          {servicios.map((s) => (
            <button
              key={s.uuid}
              type="button"
              className={btnOpcion(servicio?.uuid === s.uuid)}
              onClick={() => {
                setServicio(s);
                setPaso(barberos.length > 1 ? 'barbero' : 'diaHora');
              }}
            >
              <span className="flex items-center justify-between">
                <span className="font-semibold">
                  {s.emoji} {s.nombre}
                </span>
                <span className="num text-sm opacity-70">
                  $ {formatNumero(s.precio)} · {s.duracionMin} {copy.minutos}
                </span>
              </span>
            </button>
          ))}
        </section>
      )}

      {paso === 'barbero' && (
        <section className="animate-pop space-y-2.5">
          <h2 className="mb-3 text-lg font-bold">{copy.pasos.barbero}</h2>
          {barberos.map((b) => (
            <button
              key={b.uuid}
              type="button"
              className={btnOpcion(barberoUuid === b.uuid)}
              onClick={() => {
                setBarberoUuid(b.uuid);
                setPaso('diaHora');
              }}
            >
              <span className="font-semibold">
                {b.emoji ? `${b.emoji} ` : ''}
                {b.nombre}
              </span>
            </button>
          ))}
          <BotonAtras onClick={() => setPaso('servicio')} />
        </section>
      )}

      {paso === 'diaHora' && servicio && (
        <section className="animate-pop">
          <h2 className="mb-3 text-lg font-bold">{copy.pasos.diaHora}</h2>
          <TiraDias
            dia={dia}
            onCambiar={(d) => {
              setDia(d);
              setHora('');
              setError('');
            }}
          />
          {horario?.cerrado ? (
            <p className="card p-4 text-sm text-carbon-900/60">{copy.cerradoEseDia}</p>
          ) : horas.length === 0 ? (
            <p className="card p-4 text-sm text-carbon-900/60">{copy.sinHorarios}</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {horas.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => {
                    setHora(h);
                    setError('');
                    setPaso('datos');
                  }}
                  className={`num rounded-xl border-2 py-2.5 text-sm font-semibold transition ${
                    hora === h ? 'border-carbon bg-carbon text-white' : 'border-carbon/15 bg-white'
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          )}
          {error && <p className="mt-3 text-sm font-semibold text-rojo">{error}</p>}
          <BotonAtras onClick={() => setPaso(barberos.length > 1 ? 'barbero' : 'servicio')} />
        </section>
      )}

      {paso === 'datos' && servicio && (
        <section className="animate-pop space-y-4">
          <h2 className="text-lg font-bold">{copy.pasos.datos}</h2>

          <div className="card p-4 text-sm text-carbon-900/70">
            {servicio.emoji} {servicio.nombre} · {formatFechaLarga(dia)} ·{' '}
            <span className="num font-bold">{hora} hs</span>
          </div>

          <Campo label={copy.datos.nombre}>
            <input
              className="input-texto"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder={copy.datos.nombrePlaceholder}
            />
          </Campo>
          <Campo label={copy.datos.telefono}>
            <input
              className="input-texto num"
              inputMode="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder={copy.datos.telefonoPlaceholder}
            />
            <span className="mt-1 block text-xs text-carbon-900/50">{copy.datos.telefonoAyuda}</span>
          </Campo>
          <Campo label={copy.datos.email}>
            <input
              className="input-texto"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={copy.datos.emailPlaceholder}
            />
          </Campo>

          <button
            type="button"
            className="btn-primario"
            disabled={!nombre.trim() || !telefono.trim() || guardando}
            onClick={confirmar}
          >
            {copy.confirmar}
          </button>
          <BotonAtras onClick={() => setPaso('diaHora')} />
        </section>
      )}

      {paso === 'listo' && (
        <section className="animate-pop flex flex-col items-center gap-4 py-8 text-center">
          <span className="text-6xl">✅</span>
          <h2 className="text-2xl font-extrabold">{copy.listo.titulo}</h2>
          <p className="text-carbon-900/70">
            {formatFechaLarga(dia)} · <span className="num font-bold">{hora} hs</span>
          </p>
          <p className="text-sm text-carbon-900/50">{copy.listo.bajada}</p>
          <button type="button" className="btn-secundario mt-4" onClick={reiniciar}>
            {copy.listo.otro}
          </button>
        </section>
      )}
    </div>
  );
}

function BotonAtras({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="mt-4 w-full py-2 text-center font-semibold text-carbon-900/50"
      onClick={onClick}
    >
      {copy.atras}
    </button>
  );
}
