import { useContext, type ReactNode } from 'react';
import { AbrirAjustesContext } from './contexto';
import { IconoAjustes, IconoFlechaIzq } from './Iconos';

interface Props {
  titulo: string;
  subtitulo?: string;
  accion?: ReactNode;
  /** Si viene, muestra una flecha "atrás" a la izquierda del título (sub-página). */
  volver?: () => void;
  children: ReactNode;
}

/** Contenedor estándar de cada pantalla: header + contenido con padding. */
export function Pantalla({ titulo, subtitulo, accion, volver, children }: Props) {
  const abrirAjustes = useContext(AbrirAjustesContext);

  return (
    <div className="safe-top pad-nav mx-auto min-h-full w-full max-w-md px-4">
      <header className="flex items-start justify-between gap-3 pb-4 pt-6">
        <div className="flex min-w-0 items-start gap-2">
          {volver && (
            <button
              type="button"
              onClick={volver}
              aria-label="Atrás"
              className="-ml-2 mt-0.5 rounded-full p-2 text-carbon-900/60 transition active:bg-carbon-100"
            >
              <IconoFlechaIzq width={22} height={22} />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold text-carbon-900">{titulo}</h1>
            {subtitulo && <p className="mt-0.5 text-sm text-carbon-900/50">{subtitulo}</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {accion}
          {!volver && abrirAjustes && (
            <button
              type="button"
              onClick={abrirAjustes}
              aria-label="Ajustes"
              className="rounded-full p-2 text-carbon-900/45 transition active:bg-carbon-100"
            >
              <IconoAjustes width={23} height={23} />
            </button>
          )}
        </div>
      </header>
      {children}
    </div>
  );
}
