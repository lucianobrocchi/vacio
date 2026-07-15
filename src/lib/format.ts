// Formato de plata en pesos argentinos.

const FMT_PESOS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const FMT_NUMERO = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** "$ 12.000" — con símbolo de peso. */
export function formatPesos(n: number): string {
  return FMT_PESOS.format(Math.round(n));
}

/** "12.000" — solo el número (para inputs). */
export function formatNumero(n: number): string {
  return FMT_NUMERO.format(Math.round(n));
}

/**
 * Convierte el texto tipeado en un input de plata a número entero de pesos.
 * Deja solo dígitos: "12.000" -> 12000, "$2 000" -> 2000.
 */
export function parsePesos(texto: string): number {
  const soloDigitos = texto.replace(/[^\d]/g, '');
  if (!soloDigitos) return 0;
  return parseInt(soloDigitos, 10);
}
