import { useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { listarBarberos, pinCorrecto } from '../../db/barberos';
import { actualizarConfig } from '../../db/config';
import { Logo } from '../../components/Logo';
import { IconoFlechaDer } from '../../components/Iconos';
import type { Barbero } from '../../db/types';
import { copy } from './acceso.copy';

/**
 * Acceso por barbero: cada uno entra con su PIN desde su propio teléfono.
 * Define quién es este dispositivo (barberoActivoUuid) y si ve los números
 * del local (esDuenio). Esos dos datos NO se sincronizan: son de este equipo.
 */
export function Acceso() {
  const barberos = useLiveQuery(() => listarBarberos(), []) ?? [];
  const [elegido, setElegido] = useState<Barbero | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  async function entrar() {
    if (!elegido) return;
    if (!pinCorrecto(elegido, pin)) {
      setError(true);
      setPin('');
      return;
    }
    await actualizarConfig({
      barberoActivoUuid: elegido.uuid,
      esDuenio: !!elegido.esDuenio,
    });
  }

  // Paso 2: PIN del barbero elegido.
  if (elegido) {
    return (
      <Marco>
        <h1 className="text-2xl font-extrabold">{copy.pinTitulo(elegido.nombre)}</h1>
        <p className="text-sm text-carbon-900/55">{copy.pinBajada}</p>
        <input
          className="input-texto num mt-2 text-center text-3xl tracking-[0.5em]"
          type="password"
          inputMode="numeric"
          autoFocus
          maxLength={4}
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, ''));
            setError(false);
          }}
          onKeyDown={(e) => e.key === 'Enter' && entrar()}
          placeholder="••••"
          aria-label={copy.pinBajada}
        />
        {error && <p className="text-center text-sm font-semibold text-rojo">{copy.pinIncorrecto}</p>}
        <button type="button" className="btn-primario py-3 text-base" onClick={entrar}>
          {copy.entrar}
        </button>
        <button
          type="button"
          className="py-1 text-sm font-semibold text-carbon-900/50"
          onClick={() => {
            setElegido(null);
            setPin('');
            setError(false);
          }}
        >
          {copy.volver}
        </button>
        <p className="text-center text-xs text-carbon-900/45">{copy.ayuda}</p>
      </Marco>
    );
  }

  // Paso 1: quién sos.
  return (
    <Marco>
      <h1 className="text-2xl font-extrabold">{copy.titulo}</h1>
      <p className="text-sm text-carbon-900/55">{copy.bajada}</p>
      {barberos.length === 0 ? (
        <p className="py-6 text-center text-sm text-carbon-900/55">{copy.sinBarberos}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {barberos.map((b) => (
            <li key={b.uuid}>
              <button
                type="button"
                onClick={() => setElegido(b)}
                className="card flex w-full items-center gap-3 p-4 text-left transition active:scale-[0.99]"
              >
                <span className="text-2xl">{b.emoji ?? '💈'}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{b.nombre}</span>
                  {b.esDuenio && (
                    <span className="text-xs font-semibold uppercase tracking-wide text-oro-dark">
                      {copy.duenio}
                    </span>
                  )}
                </span>
                <IconoFlechaDer width={18} height={18} className="shrink-0 text-carbon-900/30" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Marco>
  );
}

function Marco({ children }: { children: ReactNode }) {
  return (
    <div className="safe-top mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-3 px-6 py-10">
      <div className="mb-2 flex justify-center">
        <Logo chico />
      </div>
      {children}
    </div>
  );
}
