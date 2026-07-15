import type { ReactNode } from 'react';

interface Props {
  titulo: string;
  subtitulo?: string;
  accion?: ReactNode;
  children: ReactNode;
}

/** Contenedor estándar de cada pestaña: header + contenido con padding. */
export function Pantalla({ titulo, subtitulo, accion, children }: Props) {
  return (
    <div className="safe-top pad-nav mx-auto min-h-full w-full max-w-md px-4">
      <header className="flex items-start justify-between gap-3 pb-4 pt-6">
        <div>
          <h1 className="text-2xl font-extrabold text-carbon-900">{titulo}</h1>
          {subtitulo && <p className="mt-0.5 text-sm text-carbon-900/50">{subtitulo}</p>}
        </div>
        {accion}
      </header>
      {children}
    </div>
  );
}
