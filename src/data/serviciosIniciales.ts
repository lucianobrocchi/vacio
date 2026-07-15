// Servicios típicos de barbería argentina para el onboarding.
// Precios de referencia: se editan ahí mismo antes de crear.

export interface ServicioInicial {
  nombre: string;
  precio: number;
  duracionMin: number;
  emoji: string;
  /** Preseleccionado en el onboarding. */
  sugerido: boolean;
}

export const SERVICIOS_INICIALES: ServicioInicial[] = [
  { nombre: 'Corte', precio: 10000, duracionMin: 30, emoji: '✂️', sugerido: true },
  { nombre: 'Corte + barba', precio: 14000, duracionMin: 45, emoji: '🧔', sugerido: true },
  { nombre: 'Barba', precio: 6000, duracionMin: 20, emoji: '🪒', sugerido: true },
  { nombre: 'Diseño', precio: 12000, duracionMin: 45, emoji: '💈', sugerido: false },
  { nombre: 'Color / mechas', precio: 20000, duracionMin: 90, emoji: '🎨', sugerido: false },
  { nombre: 'Cejas', precio: 3000, duracionMin: 10, emoji: '👁️', sugerido: false },
];
