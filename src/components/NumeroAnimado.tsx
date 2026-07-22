import { useEffect, useRef, useState } from 'react';
import { formatPesos } from '../lib/format';

interface Props {
  valor: number;
  /** Cómo mostrar el número (default: pesos). */
  formato?: (n: number) => string;
  duracion?: number;
  className?: string;
}

const REDUCIR =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Número que "cuenta" hasta su valor (count-up), con easing suave. */
export function NumeroAnimado({ valor, formato = formatPesos, duracion = 750, className }: Props) {
  const [mostrado, setMostrado] = useState(REDUCIR ? valor : 0);
  const desdeRef = useRef(REDUCIR ? valor : 0);

  useEffect(() => {
    if (REDUCIR) {
      desdeRef.current = valor;
      setMostrado(valor);
      return;
    }
    const desde = desdeRef.current;
    if (desde === valor) return;
    const t0 = performance.now();
    let raf = 0;
    const paso = (t: number) => {
      const p = Math.min((t - t0) / duracion, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const actual = desde + (valor - desde) * eased;
      desdeRef.current = actual;
      setMostrado(actual);
      if (p < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [valor, duracion]);

  return <span className={`num ${className ?? ''}`}>{formato(mostrado)}</span>;
}
