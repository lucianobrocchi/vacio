import { useEffect, useState } from 'react';
import { actualizarConfig } from '../../db/config';
import { Logo } from '../../components/Logo';

/** Clave donde guardamos a quién invitaron, para preseleccionarlo en el PIN. */
export const LS_INVITADO = 'corte.invitado.barbero';

function paramsDelHash(): { codigo: string; barbero: string } {
  const q = location.hash.split('?')[1] ?? '';
  const p = new URLSearchParams(q);
  return { codigo: (p.get('c') ?? '').trim().toUpperCase(), barbero: p.get('b') ?? '' };
}

/**
 * "#/unirse?c=CODIGO&b=UUID": el barbero abre el link que le mandó el dueño.
 * Deja el código de la barbería cargado en este teléfono y se va al arranque
 * normal, que va a sincronizar y pedirle solo su PIN.
 */
export function Unirse() {
  const [error, setError] = useState('');

  useEffect(() => {
    const { codigo, barbero } = paramsDelHash();
    if (!codigo) {
      setError('Este link no es válido. Pedile al dueño que te lo mande de nuevo.');
      return;
    }
    (async () => {
      try {
        localStorage.setItem(LS_INVITADO, barbero);
      } catch {
        /* modo privado sin storage: seguimos igual */
      }
      await actualizarConfig({ licenciaCodigo: codigo });
      // Volvemos a la raíz: el arranque normal hace el resto (licencia → sync → PIN).
      location.hash = '';
      location.reload();
    })();
  }, []);

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 px-8 text-center">
      <Logo />
      {error ? (
        <p className="text-sm font-semibold text-rojo">{error}</p>
      ) : (
        <p className="animate-fade text-sm font-semibold text-carbon-900/55">
          Entrando a tu barbería…
        </p>
      )}
    </div>
  );
}
