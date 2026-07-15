interface Barra {
  etiqueta: string;
  valor: number;
  /** Resaltada (p. ej. hoy / mejor día). */
  destacada?: boolean;
}

/** Gráfico de barras verticales hecho con divs. Simple y liviano. */
export function GraficoBarras({ barras, alto = 96 }: { barras: Barra[]; alto?: number }) {
  const max = Math.max(...barras.map((b) => b.valor), 1);
  // Con muchas barras (mes) se afina y se muestran menos etiquetas.
  const cadaCuanto = barras.length > 14 ? 5 : 1;

  return (
    <div className="flex items-end gap-1" style={{ height: alto + 22 }}>
      {barras.map((b, i) => (
        <div key={b.etiqueta + i} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <div
            className={`w-full rounded-t-md ${b.destacada ? 'bg-oro' : 'bg-carbon/75'}`}
            style={{ height: Math.max((b.valor / max) * alto, b.valor > 0 ? 4 : 1) }}
          />
          <span className="h-4 truncate text-[10px] text-carbon-900/40">
            {i % cadaCuanto === 0 ? b.etiqueta : ''}
          </span>
        </div>
      ))}
    </div>
  );
}
