import { useEffect, type ReactNode } from 'react';
import { IconoCerrar } from './Iconos';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  children: ReactNode;
}

/** Hoja inferior (bottom sheet) para formularios rápidos. */
export function Sheet({ abierto, onCerrar, titulo, children }: Props) {
  // Cerrar con Escape (útil en escritorio / testing).
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div
        className="animate-fade absolute inset-0 bg-carbon-900/40"
        onClick={onCerrar}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="animate-sheet relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white shadow-sheet"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-5 pb-2 pt-4">
          <h2 className="text-xl font-bold text-carbon-900">{titulo}</h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="-mr-2 rounded-full p-2 text-carbon-900/50 transition active:bg-carbon-50"
          >
            <IconoCerrar width={22} height={22} />
          </button>
        </div>
        <div className="px-5 pb-6 pt-2">{children}</div>
      </div>
    </div>
  );
}
