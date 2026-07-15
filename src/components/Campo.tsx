import type { ReactNode } from 'react';

/**
 * Label + control, con el espaciado estándar de los formularios.
 * Usa <div> (no <label>) porque varios campos envuelven grillas de botones,
 * y anidar botones dentro de un <label> ensucia sus nombres accesibles.
 */
export function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="block">
      <span className="mb-1.5 block text-sm font-semibold text-carbon-900/70">{label}</span>
      {children}
    </div>
  );
}
