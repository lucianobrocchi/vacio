import { useId } from 'react';

interface Props {
  /** Serie de valores (uno por punto/día). */
  data: number[];
  /** Índice a destacar con un punto (p. ej. el mejor día). */
  destacado?: number;
  alto?: number;
  /** Trazo y relleno; por defecto oro. */
  color?: string;
}

/**
 * Gráfico de área con degradado y línea suave. SVG puro, escalable.
 * Pensado para la tendencia de facturado del período.
 */
export function AreaChart({ data, destacado, alto = 120, color = '#C79A3B' }: Props) {
  const id = useId();
  const W = 300;
  const H = alto;
  const pad = 8;
  const n = data.length;
  const max = Math.max(...data, 1);

  const x = (i: number) => (n <= 1 ? W / 2 : pad + (i / (n - 1)) * (W - pad * 2));
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2);

  // Línea suave (Catmull-Rom → Bézier) para que no se vea quebrada.
  const pts = data.map((v, i) => [x(i), y(v)] as const);
  let d = '';
  if (pts.length === 1) {
    d = `M ${pts[0][0]} ${pts[0][1]}`;
  } else {
    d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2[0]} ${p2[1]}`;
    }
  }
  const area = `${d} L ${x(n - 1)} ${H - pad} L ${x(0)} ${H - pad} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: H }}>
      <defs>
        <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#fill-${id})`} className="anim-despues" />
      <path
        d={d}
        pathLength={1}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="anim-trazo"
      />
      {destacado != null && data[destacado] != null && (
        <g className="anim-despues">
          <circle cx={x(destacado)} cy={y(data[destacado])} r="7" fill={color} fillOpacity="0.25" />
          <circle cx={x(destacado)} cy={y(data[destacado])} r="3.5" fill={color} />
        </g>
      )}
    </svg>
  );
}
