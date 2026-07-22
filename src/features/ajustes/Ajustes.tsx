import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { actualizarConfig } from '../../db/config';
import {
  listarBarberos,
  crearBarbero,
  actualizarBarbero,
  desactivarBarbero,
  COMISION_DEFAULT,
} from '../../db/barberos';
import {
  conectarGoogle,
  desconectarGoogle,
  googleConectado,
  clientIdEfectivo,
} from '../../lib/googleCalendar';
import {
  listarServicios,
  crearServicio,
  actualizarServicio,
  desactivarServicio,
} from '../../db/servicios';
import { cargarDatosDemo, borrarTodo } from '../../db/demo';
import { linkReservas } from '../../lib/mensajes';
import { formatNumero, parsePesos } from '../../lib/format';
import { NOMBRES_DIAS, horaAMin, minAHora } from '../../lib/fecha';
import { Pantalla } from '../../components/Pantalla';
import { Sheet } from '../../components/Sheet';
import { Campo } from '../../components/Campo';
import {
  IconoCalendario,
  IconoCheck,
  IconoCopiar,
  IconoLink,
  IconoMas,
  IconoTacho,
} from '../../components/Iconos';
import type { Barbero, Config, Servicio } from '../../db/types';
import { copy } from './ajustes.copy';

export function Ajustes({ config, onCerrar }: { config: Config; onCerrar?: () => void }) {
  const barberos = useLiveQuery(() => listarBarberos(), []) ?? [];
  const servicios = useLiveQuery(() => listarServicios(), []) ?? [];

  const [nombre, setNombre] = useState(config.nombreBarberia);
  const [barberoSheet, setBarberoSheet] = useState(false);
  const [barberoEditando, setBarberoEditando] = useState<Barbero | undefined>();
  const [servicioSheet, setServicioSheet] = useState(false);
  const [servicioEditando, setServicioEditando] = useState<Servicio | undefined>();
  const [copiado, setCopiado] = useState(false);
  const [demoCargada, setDemoCargada] = useState(false);
  const [cargandoDemo, setCargandoDemo] = useState(false);

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(linkReservas());
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt('Copiá el link:', linkReservas());
    }
  }

  async function cargarDemo() {
    if (cargandoDemo) return;
    setCargandoDemo(true);
    await cargarDatosDemo(config.barberoActivoUuid);
    setCargandoDemo(false);
    setDemoCargada(true);
  }

  async function empezarDeCero() {
    if (!window.confirm(copy.datos.confirmarBorrar)) return;
    await borrarTodo();
    location.hash = '';
    location.reload();
  }

  const tituloSeccion = 'mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-carbon-900/40';

  return (
    <Pantalla titulo={copy.titulo} volver={onCerrar}>
      {/* Barbería */}
      <h3 className={tituloSeccion}>{copy.barberia.titulo}</h3>
      <div className="card space-y-4 p-4">
        <Campo label={copy.barberia.nombre}>
          <input
            className="input-texto"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onBlur={() => nombre.trim() && actualizarConfig({ nombreBarberia: nombre.trim() })}
          />
        </Campo>
        {barberos.length > 1 && (
          <Campo label={copy.barberia.barberoActivo}>
            <select
              className="input-texto appearance-none"
              value={config.barberoActivoUuid}
              onChange={(e) => actualizarConfig({ barberoActivoUuid: e.target.value })}
            >
              {barberos.map((b) => (
                <option key={b.uuid} value={b.uuid}>
                  {b.nombre}
                </option>
              ))}
            </select>
          </Campo>
        )}
        <button
          type="button"
          className="flex w-full items-center justify-between"
          onClick={() => actualizarConfig({ esDuenio: !config.esDuenio })}
        >
          <span className="text-left">
            <span className="block font-semibold">{copy.barberia.esDuenio}</span>
            <span className="block text-sm text-carbon-900/50">{copy.barberia.esDuenioAyuda}</span>
          </span>
          <span
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${
              config.esDuenio ? 'bg-carbon' : 'bg-carbon/20'
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
                config.esDuenio ? 'left-6' : 'left-1'
              }`}
            />
          </span>
        </button>
      </div>

      {/* Barberos */}
      <h3 className={tituloSeccion}>{copy.barberos.titulo}</h3>
      <div className="card divide-y divide-carbon/5 p-2">
        {barberos.map((b) => (
          <button
            key={b.uuid}
            type="button"
            className="flex w-full items-center gap-3 p-3 text-left"
            onClick={() => {
              setBarberoEditando(b);
              setBarberoSheet(true);
            }}
          >
            <span className="text-xl">{b.emoji ?? '💈'}</span>
            <span className="flex-1 font-semibold">{b.nombre}</span>
            {b.uuid === config.barberoActivoUuid && (
              <span className="rounded-full bg-oro-light px-2.5 py-0.5 text-xs font-bold text-oro-dark">
                vos
              </span>
            )}
          </button>
        ))}
        <button
          type="button"
          className="flex w-full items-center gap-3 p-3 font-semibold text-carbon-900/60"
          onClick={() => {
            setBarberoEditando(undefined);
            setBarberoSheet(true);
          }}
        >
          <IconoMas width={20} height={20} />
          {copy.barberos.agregar}
        </button>
      </div>

      {/* Servicios */}
      <h3 className={tituloSeccion}>{copy.servicios.titulo}</h3>
      <div className="card divide-y divide-carbon/5 p-2">
        {servicios.map((s) => (
          <button
            key={s.uuid}
            type="button"
            className="flex w-full items-center gap-3 p-3 text-left"
            onClick={() => {
              setServicioEditando(s);
              setServicioSheet(true);
            }}
          >
            <span className="text-xl">{s.emoji ?? '✂️'}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{s.nombre}</span>
              <span className="block text-sm text-carbon-900/50">
                {s.duracionMin} {copy.servicios.minutos}
              </span>
            </span>
            <span className="num font-bold">$ {formatNumero(s.precio)}</span>
          </button>
        ))}
        <button
          type="button"
          className="flex w-full items-center gap-3 p-3 font-semibold text-carbon-900/60"
          onClick={() => {
            setServicioEditando(undefined);
            setServicioSheet(true);
          }}
        >
          <IconoMas width={20} height={20} />
          {copy.servicios.agregar}
        </button>
      </div>

      {/* Horario */}
      <h3 className={tituloSeccion}>{copy.horario.titulo}</h3>
      <div className="card divide-y divide-carbon/5 p-2">
        {/* Orden humano: lunes a domingo (índices JS 1..6, 0). */}
        {[1, 2, 3, 4, 5, 6, 0].map((dia) => (
          <FilaHorario key={dia} dia={dia} config={config} />
        ))}
      </div>

      {/* Link de reservas */}
      <h3 className={tituloSeccion}>{copy.reservas.titulo}</h3>
      <div className="card space-y-3 p-4">
        <p className="text-sm text-carbon-900/60">{copy.reservas.bajada}</p>
        <div className="flex gap-2">
          <button type="button" className="btn-primario flex-1 py-3 text-base" onClick={copiarLink}>
            <IconoCopiar width={18} height={18} />
            {copiado ? copy.reservas.copiado : copy.reservas.copiar}
          </button>
          <a href="#/reservar" className="btn-secundario flex-1 py-3 text-base">
            <IconoLink width={18} height={18} />
            {copy.reservas.abrir}
          </a>
        </div>
        <p className="text-xs text-carbon-900/45">{copy.reservas.aviso}</p>
      </div>

      {/* Google Calendar */}
      <h3 className={tituloSeccion}>{copy.google.titulo}</h3>
      <GoogleSection config={config} />

      {/* Datos */}
      <h3 className={tituloSeccion}>{copy.datos.titulo}</h3>
      <div className="card space-y-4 p-4">
        <div>
          <button
            type="button"
            className="btn-secundario py-3 text-base"
            disabled={cargandoDemo}
            onClick={cargarDemo}
          >
            {copy.datos.demo}
          </button>
          <p className="mt-1.5 text-xs text-carbon-900/45">
            {demoCargada ? copy.datos.demoListo : copy.datos.demoAyuda}
          </p>
        </div>
        <div>
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-rojo/30 px-6 py-3 font-semibold text-rojo transition active:scale-[0.98]"
            onClick={empezarDeCero}
          >
            <IconoTacho width={18} height={18} />
            {copy.datos.borrar}
          </button>
          <p className="mt-1.5 text-xs text-carbon-900/45">{copy.datos.borrarAyuda}</p>
        </div>
      </div>

      <BarberoSheet
        abierto={barberoSheet}
        onCerrar={() => setBarberoSheet(false)}
        barbero={barberoEditando}
        esElActivo={barberoEditando?.uuid === config.barberoActivoUuid}
      />
      <ServicioSheet
        abierto={servicioSheet}
        onCerrar={() => setServicioSheet(false)}
        servicio={servicioEditando}
      />
    </Pantalla>
  );
}

/** Una fila del horario semanal: toggle cerrado + rango de horas. */
function FilaHorario({ dia, config }: { dia: number; config: Config }) {
  const h = config.horario[dia];
  const opciones: string[] = [];
  for (let m = 6 * 60; m <= 23 * 60; m += 30) opciones.push(minAHora(m));

  async function guardar(cambios: Partial<typeof h>) {
    const horario = config.horario.map((x, i) => (i === dia ? { ...x, ...cambios } : x));
    await actualizarConfig({ horario });
  }

  const selectClase =
    'num appearance-none rounded-lg border border-carbon/15 bg-white px-2 py-1 text-sm font-semibold';

  return (
    <div className="flex items-center gap-2 p-3">
      <span className="w-20 shrink-0 text-sm font-semibold">{NOMBRES_DIAS[dia]}</span>
      <div className="flex flex-1 items-center justify-end gap-2">
        {!h.cerrado && (
          <>
            <select
              className={selectClase}
              value={h.abre}
              onChange={(e) => {
                const abre = e.target.value;
                guardar({
                  abre,
                  cierra: horaAMin(h.cierra) > horaAMin(abre) ? h.cierra : minAHora(horaAMin(abre) + 60),
                });
              }}
            >
              {opciones.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
            <span className="text-xs text-carbon-900/40">{copy.horario.a}</span>
            <select
              className={selectClase}
              value={h.cierra}
              onChange={(e) => guardar({ cierra: e.target.value })}
            >
              {opciones.filter((o) => horaAMin(o) > horaAMin(h.abre)).map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </>
        )}
        <button
          type="button"
          onClick={() => guardar({ cerrado: !h.cerrado })}
          className={`rounded-full px-3 py-1 text-xs font-bold transition ${
            h.cerrado ? 'bg-rojo/10 text-rojo' : 'bg-ok/10 text-ok'
          }`}
        >
          {h.cerrado ? copy.horario.cerrado : 'Abierto'}
        </button>
      </div>
    </div>
  );
}

/** Conectar la cuenta de Google Calendar (client-side, con GIS). */
function GoogleSection({ config }: { config: Config }) {
  const g = copy.google;
  const [clientId, setClientId] = useState(config.googleClientId ?? '');
  const [conectado, setConectado] = useState(googleConectado());
  const [estado, setEstado] = useState<'idle' | 'conectando' | 'error'>('idle');
  const [avanzado, setAvanzado] = useState(false);

  // Client ID efectivo: el compartido de la app (env) o el propio del barbero.
  const idEfectivo = clientIdEfectivo(config);
  const listo = !!idEfectivo;

  async function conectar() {
    if (!idEfectivo) return;
    setEstado('conectando');
    try {
      await conectarGoogle(idEfectivo);
      setConectado(true);
      setEstado('idle');
    } catch {
      setEstado('error');
    }
  }

  function desconectar() {
    desconectarGoogle();
    setConectado(false);
  }

  return (
    <div className="card space-y-3 p-4">
      <p className="text-sm text-carbon-900/60">{g.bajada}</p>

      <span
        className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
          conectado ? 'bg-ok/15 text-ok' : 'bg-carbon-100 text-carbon-900/50'
        }`}
      >
        {conectado && <IconoCheck width={13} height={13} />}
        {conectado ? g.conectado : g.desconectado}
      </span>

      {listo ? (
        !conectado ? (
          <button
            type="button"
            className="btn-primario py-3 text-base"
            disabled={estado === 'conectando'}
            onClick={conectar}
          >
            <IconoCalendario width={20} height={20} />
            {estado === 'conectando' ? g.conectando : g.conectar}
          </button>
        ) : (
          <button type="button" className="btn-secundario py-3 text-base" onClick={desconectar}>
            {g.desconectar}
          </button>
        )
      ) : (
        <p className="text-sm text-carbon-900/55">{g.faltaConfig}</p>
      )}

      {estado === 'error' && <p className="text-sm font-semibold text-rojo">{g.error}</p>}

      {/* Avanzado: usar una cuenta de Google propia (Client ID propio) */}
      <button
        type="button"
        className="text-left text-sm font-semibold text-carbon-900/50"
        onClick={() => setAvanzado(!avanzado)}
      >
        {avanzado ? '▲' : '▼'} {g.avanzado}
      </button>
      {avanzado && (
        <div className="space-y-3 rounded-xl bg-carbon-50 p-3">
          <Campo label={g.clientId}>
            <input
              className="input-texto text-sm"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              onBlur={() => actualizarConfig({ googleClientId: clientId.trim() || undefined })}
              placeholder={g.clientIdPlaceholder}
            />
          </Campo>
          <ol className="list-decimal space-y-1 pl-4 text-xs text-carbon-900/70">
            {g.pasos.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
          <p className="break-all text-xs text-carbon-900/70">
            <b>{g.dominioActual}</b>
            <br />
            {location.origin}
          </p>
        </div>
      )}
    </div>
  );
}

function BarberoSheet({
  abierto,
  onCerrar,
  barbero,
  esElActivo,
}: {
  abierto: boolean;
  onCerrar: () => void;
  barbero?: Barbero;
  esElActivo: boolean;
}) {
  const c = copy.barberos.sheet;
  const [nombre, setNombre] = useState('');
  const [emoji, setEmoji] = useState('');
  const [comision, setComision] = useState(COMISION_DEFAULT);

  useEffect(() => {
    if (!abierto) return;
    setNombre(barbero?.nombre ?? '');
    setEmoji(barbero?.emoji ?? '');
    setComision(barbero?.comision ?? COMISION_DEFAULT);
  }, [abierto, barbero]);

  async function guardar() {
    if (!nombre.trim()) return;
    const pct = Math.max(0, Math.min(100, comision));
    if (barbero) {
      await actualizarBarbero(barbero.uuid, {
        nombre: nombre.trim(),
        emoji: emoji.trim() || undefined,
        comision: pct,
      });
    } else {
      await crearBarbero({ nombre: nombre.trim(), emoji: emoji.trim() || undefined, comision: pct });
    }
    onCerrar();
  }

  async function quitar() {
    if (!barbero) return;
    await desactivarBarbero(barbero.uuid);
    onCerrar();
  }

  return (
    <Sheet abierto={abierto} onCerrar={onCerrar} titulo={barbero ? c.tituloEditar : c.tituloNuevo}>
      <div className="space-y-4">
        <Campo label={c.nombre}>
          <input
            className="input-texto"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={c.nombrePlaceholder}
          />
        </Campo>
        <Campo label={c.emoji}>
          <input
            className="input-texto"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder={c.emojiPlaceholder}
            maxLength={4}
          />
        </Campo>
        <Campo label={c.comision}>
          <div className="flex items-center gap-2 rounded-2xl border-2 border-carbon/15 bg-white px-3">
            <input
              className="num w-full py-3 text-right text-lg font-semibold outline-none"
              inputMode="numeric"
              value={comision}
              onChange={(e) => setComision(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
            />
            <span className="font-semibold text-carbon-900/40">%</span>
          </div>
          <span className="mt-1 block text-xs text-carbon-900/50">{c.comisionAyuda}</span>
        </Campo>
        <button type="button" className="btn-primario" disabled={!nombre.trim()} onClick={guardar}>
          {c.guardar}
        </button>
        {barbero && !esElActivo && (
          <div className="text-center">
            <button type="button" className="py-1 font-semibold text-rojo" onClick={quitar}>
              {c.quitar}
            </button>
            <p className="text-xs text-carbon-900/45">{c.quitarAyuda}</p>
          </div>
        )}
      </div>
    </Sheet>
  );
}

function ServicioSheet({
  abierto,
  onCerrar,
  servicio,
}: {
  abierto: boolean;
  onCerrar: () => void;
  servicio?: Servicio;
}) {
  const c = copy.servicios.sheet;
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState(0);
  const [duracion, setDuracion] = useState(30);
  const [emoji, setEmoji] = useState('');

  useEffect(() => {
    if (!abierto) return;
    setNombre(servicio?.nombre ?? '');
    setPrecio(servicio?.precio ?? 0);
    setDuracion(servicio?.duracionMin ?? 30);
    setEmoji(servicio?.emoji ?? '');
  }, [abierto, servicio]);

  async function guardar() {
    if (!nombre.trim() || precio <= 0) return;
    const datos = {
      nombre: nombre.trim(),
      precio,
      duracionMin: duracion,
      emoji: emoji.trim() || undefined,
    };
    if (servicio) await actualizarServicio(servicio.uuid, datos);
    else await crearServicio(datos);
    onCerrar();
  }

  async function quitar() {
    if (!servicio) return;
    await desactivarServicio(servicio.uuid);
    onCerrar();
  }

  return (
    <Sheet abierto={abierto} onCerrar={onCerrar} titulo={servicio ? c.tituloEditar : c.tituloNuevo}>
      <div className="space-y-4">
        <Campo label={c.nombre}>
          <input
            className="input-texto"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={c.nombrePlaceholder}
          />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label={c.precio}>
            <div className="flex items-center gap-1 rounded-2xl border-2 border-carbon/15 bg-white px-3">
              <span className="font-semibold text-carbon-900/40">$</span>
              <input
                className="num w-full py-3 text-right text-lg font-semibold outline-none"
                inputMode="numeric"
                value={formatNumero(precio)}
                onChange={(e) => setPrecio(parsePesos(e.target.value))}
              />
            </div>
          </Campo>
          <Campo label={c.duracion}>
            <select
              className="input-texto num appearance-none py-3"
              value={duracion}
              onChange={(e) => setDuracion(Number(e.target.value))}
            >
              {[10, 15, 20, 30, 45, 60, 90, 120].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Campo>
        </div>
        <Campo label={c.emoji}>
          <input
            className="input-texto"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder={c.emojiPlaceholder}
            maxLength={4}
          />
        </Campo>
        <button
          type="button"
          className="btn-primario"
          disabled={!nombre.trim() || precio <= 0}
          onClick={guardar}
        >
          {c.guardar}
        </button>
        {servicio && (
          <div className="text-center">
            <button type="button" className="py-1 font-semibold text-rojo" onClick={quitar}>
              {c.quitar}
            </button>
            <p className="text-xs text-carbon-900/45">{c.quitarAyuda}</p>
          </div>
        )}
      </div>
    </Sheet>
  );
}
