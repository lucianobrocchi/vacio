interface Segmento {
  valor: number;
  color: string;
}

interface Props {
  segmentos: Segmento[];
  /** Texto grande en el centro. */
  centro?: string;
  /** Texto chico bajo el centro. */
  sub?: string;
  tam?: number;
}

/** Donut chart (anillo) con segmentos. SVG puro. */
export function Donut({ segmentos, centro, sub, tam = 128 }: Props) {
  const total = segmentos.reduce((a, s) => a + s.valor, 0) || 1;
  const r = 54;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="relative" style={{ width: tam, height: tam }}>
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="#EAE5DC" strokeWidth="16" />
        {segmentos.map((s, i) => {
          const frac = s.valor / total;
          const dash = frac * circ;
          const el = (
            <circle
              key={i}
              cx="64"
              cy="64"
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="16"
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += dash;
          return el;
        })}
      </svg>
      {(centro || sub) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centro && <span className="num text-lg font-extrabold text-carbon-900">{centro}</span>}
          {sub && <span className="text-[11px] font-medium text-carbon-900/50">{sub}</span>}
        </div>
      )}
    </div>
  );
}
