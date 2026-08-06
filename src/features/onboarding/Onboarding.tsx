import { useState } from 'react';
import { actualizarConfig } from '../../db/config';
import { crearBarbero } from '../../db/barberos';
import { crearServicio } from '../../db/servicios';
import { SERVICIOS_INICIALES } from '../../data/serviciosIniciales';
import { formatNumero, parsePesos } from '../../lib/format';
import { Logo } from '../../components/Logo';
import { Campo } from '../../components/Campo';
import { IconoCheck } from '../../components/Iconos';
import { copy } from './onboarding.copy';

type Paso = 'bienvenida' | 'servicios' | 'listo';

interface SeleccionServicio {
  elegido: boolean;
  precio: number;
}

export function Onboarding() {
  const [paso, setPaso] = useState<Paso>('bienvenida');
  const [nombreBarberia, setNombreBarberia] = useState('');
  const [tuNombre, setTuNombre] = useState('');
  const [esDuenio, setEsDuenio] = useState(true);
  const [seleccion, setSeleccion] = useState<SeleccionServicio[]>(
    SERVICIOS_INICIALES.map((s) => ({ elegido: s.sugerido, precio: s.precio })),
  );
  const [guardando, setGuardando] = useState(false);

  async function terminar() {
    if (guardando) return;
    setGuardando(true);
    // El que instala es el primero del equipo; si marcó "soy el dueño",
    // queda como dueño y es el único que ve los números del local.
    const barberoUuid = await crearBarbero({ nombre: tuNombre, esDuenio });
    for (const [i, s] of SERVICIOS_INICIALES.entries()) {
      if (!seleccion[i].elegido) continue;
      await crearServicio({
        nombre: s.nombre,
        precio: seleccion[i].precio,
        duracionMin: s.duracionMin,
        emoji: s.emoji,
      });
    }
    await actualizarConfig({
      nombreBarberia: nombreBarberia.trim(),
      barberoActivoUuid: barberoUuid,
      esDuenio,
      onboardingCompletado: true,
    });
  }

  return (
    <div className="safe-top mx-auto flex min-h-full w-full max-w-md flex-col px-5 pb-8">
      {paso === 'bienvenida' && (
        <div className="animate-pop flex flex-1 flex-col justify-center gap-6 py-10">
          <Logo />
          <div className="text-center">
            <h1 className="text-3xl font-extrabold">{copy.bienvenida.titulo}</h1>
            <p className="mt-2 text-carbon-900/60">{copy.bienvenida.bajada}</p>
          </div>
          <div className="space-y-4">
            <Campo label={copy.bienvenida.nombreBarberia}>
              <input
                className="input-texto"
                value={nombreBarberia}
                onChange={(e) => setNombreBarberia(e.target.value)}
                placeholder={copy.bienvenida.nombreBarberiaPlaceholder}
              />
            </Campo>
            <Campo label={copy.bienvenida.tuNombre}>
              <input
                className="input-texto"
                value={tuNombre}
                onChange={(e) => setTuNombre(e.target.value)}
                placeholder={copy.bienvenida.tuNombrePlaceholder}
              />
            </Campo>
            <button
              type="button"
              onClick={() => setEsDuenio(!esDuenio)}
              className="card flex w-full items-center gap-3 p-4 text-left"
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition ${
                  esDuenio ? 'border-carbon bg-carbon text-white' : 'border-carbon/20 text-transparent'
                }`}
              >
                <IconoCheck width={16} height={16} />
              </span>
              <span>
                <span className="block font-semibold">{copy.bienvenida.sosDuenio}</span>
                <span className="block text-sm text-carbon-900/50">
                  {copy.bienvenida.sosDuenioAyuda}
                </span>
              </span>
            </button>
          </div>
          <button
            type="button"
            className="btn-primario"
            disabled={!nombreBarberia.trim() || !tuNombre.trim()}
            onClick={() => setPaso('servicios')}
          >
            {copy.bienvenida.continuar}
          </button>
        </div>
      )}

      {paso === 'servicios' && (
        <div className="animate-pop flex flex-1 flex-col gap-5 py-8">
          <div>
            <h1 className="text-2xl font-extrabold">{copy.servicios.titulo}</h1>
            <p className="mt-1 text-carbon-900/60">{copy.servicios.bajada}</p>
          </div>
          <div className="space-y-2.5">
            {SERVICIOS_INICIALES.map((s, i) => {
              const sel = seleccion[i];
              return (
                <div
                  key={s.nombre}
                  className={`card flex items-center gap-3 p-3.5 transition ${
                    sel.elegido ? 'ring-2 ring-carbon' : 'opacity-70'
                  }`}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    onClick={() =>
                      setSeleccion(
                        seleccion.map((x, j) => (j === i ? { ...x, elegido: !x.elegido } : x)),
                      )
                    }
                  >
                    <span className="text-2xl">{s.emoji}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{s.nombre}</span>
                      <span className="block text-sm text-carbon-900/50">
                        {s.duracionMin} {copy.servicios.minutos}
                      </span>
                    </span>
                  </button>
                  <div className="flex items-center gap-1 text-lg font-semibold">
                    <span className="text-carbon-900/40">$</span>
                    <input
                      className="num w-24 rounded-xl border-2 border-carbon/10 px-2 py-1.5 text-right outline-none focus:border-carbon"
                      inputMode="numeric"
                      value={formatNumero(sel.precio)}
                      onChange={(e) =>
                        setSeleccion(
                          seleccion.map((x, j) =>
                            j === i ? { ...x, precio: parsePesos(e.target.value) } : x,
                          ),
                        )
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-auto flex gap-3">
            <button type="button" className="btn-secundario flex-1" onClick={() => setPaso('bienvenida')}>
              {copy.servicios.atras}
            </button>
            <button
              type="button"
              className="btn-primario flex-1"
              disabled={!seleccion.some((s) => s.elegido)}
              onClick={() => setPaso('listo')}
            >
              {copy.servicios.continuar}
            </button>
          </div>
        </div>
      )}

      {paso === 'listo' && (
        <div className="animate-pop flex flex-1 flex-col justify-center gap-6 py-10">
          <Logo chico />
          <h1 className="text-3xl font-extrabold">{copy.listo.titulo}</h1>
          <ul className="space-y-4">
            {copy.listo.puntos.map(([emoji, texto]) => (
              <li key={texto} className="flex items-start gap-3">
                <span className="text-2xl">{emoji}</span>
                <span className="pt-0.5 text-carbon-900/75">{texto}</span>
              </li>
            ))}
          </ul>
          <button type="button" className="btn-primario" disabled={guardando} onClick={terminar}>
            {copy.listo.empezar}
          </button>
        </div>
      )}
    </div>
  );
}
