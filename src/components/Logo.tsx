/** Logo de Corte: tijera en oro sobre carbón. */
export function Logo({ chico = false }: { chico?: boolean }) {
  const lado = chico ? 40 : 72;
  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={lado} height={lado} viewBox="0 0 64 64" aria-hidden>
        <rect width="64" height="64" rx="14" fill="#221F1A" />
        <g stroke="#C79A3B" strokeWidth="4" strokeLinecap="round" fill="none">
          <line x1="22" y1="14" x2="42" y2="44" />
          <line x1="42" y1="14" x2="22" y2="44" />
        </g>
        <circle cx="19" cy="49" r="6" stroke="#C79A3B" strokeWidth="4" fill="none" />
        <circle cx="45" cy="49" r="6" stroke="#C79A3B" strokeWidth="4" fill="none" />
      </svg>
      {!chico && <span className="font-display text-3xl font-extrabold text-carbon">Corte</span>}
    </div>
  );
}
