import { useState } from 'react';
import { actualizarConfig } from '../../db/config';
import { chequearLicencia, type EstadoNube } from '../../lib/nube';
import { Logo } from '../../components/Logo';
import { IconoCandado } from '../../components/Iconos';

interface Props {
  estado: EstadoNube;
  /** Se llama cuando la licencia queda activa. */
  onActiva: () => void;
}

/**
 * Gate de membresía: se muestra cuando la nube está activa pero este
 * dispositivo no tiene una licencia válida (sin activar o suspendida).
 */
export function Membresia({ estado, onActiva }: Props) {
  const suspendida = estado.estado === 'suspendida' || estado.estado === 'vencida';
  const [codigo, setCodigo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  async function activar() {
    const c = codigo.trim().toUpperCase();
    if (!c || cargando) return;
    setCargando(true);
    setError('');
    await actualizarConfig({ licenciaCodigo: c });
    const r = await chequearLicencia(c);
    setCargando(false);
    if (r.activada) {
      await actualizarConfig({ licenciaEstado: r.estado });
      onActiva();
    } else {
      setError(
        r.estado === 'suspendida'
          ? 'Ese código está suspendido. Escribinos.'
          : r.estado === 'vencida'
            ? 'Ese código venció. Escribinos para renovar.'
            : 'Código inválido. Revisalo e intentá de nuevo.',
      );
    }
  }

  return (
    <div className="safe-top mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-6 px-6 py-10">
      <div className="animate-pop flex flex-col items-center gap-3 text-center">
        <Logo />
        {suspendida ? (
          <>
            <div className="mt-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-pendiente/15 text-pendiente">
              <IconoCandado width={28} height={28} />
            </div>
            <h1 className="text-2xl font-extrabold">Tu membresía está pausada</h1>
            <p className="text-carbon-900/60">
              Se suspendió el acceso a esta barbería. Tus datos están guardados. Escribinos para
              reactivarla o cargá un código nuevo.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-2xl font-extrabold">Activá tu Corte</h1>
            <p className="text-carbon-900/60">
              Cargá el código de activación que te pasamos para empezar a usar la app y guardar tus
              datos en la nube.
            </p>
          </>
        )}
      </div>

      <div className="space-y-3">
        <input
          className="input-texto num text-center text-lg tracking-widest"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          placeholder="CORTE-XXXX-XXXX"
          autoCapitalize="characters"
        />
        {error && <p className="text-center text-sm font-semibold text-rojo">{error}</p>}
        <button
          type="button"
          className="btn-primario"
          disabled={!codigo.trim() || cargando}
          onClick={activar}
        >
          {cargando ? 'Verificando…' : 'Activar'}
        </button>
      </div>
    </div>
  );
}
