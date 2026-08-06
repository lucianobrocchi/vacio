// Qué incluye cada plan de membresía. Es la única fuente de verdad: tanto la
// app (para habilitar funciones) como el panel admin leen de acá.
//
//   trial → para que prueben. App completa local, sin nube.
//   pro   → respaldo en la nube + datos en vivo entre celulares (Modelo B).
//   full  → todo lo de pro + reservas de Instagram a la nube, sin límite de equipos.

export type Plan = 'trial' | 'pro' | 'full';

export interface Capacidades {
  /** Guarda/restaura el respaldo de la barbería en la nube. */
  respaldoNube: boolean;
  /** Sync en vivo entre dispositivos (Modelo B). */
  syncVivo: boolean;
  /** Reservas del link público (Instagram) que caen en la agenda de la nube. */
  reservasCloud: boolean;
  /** Cuántos celulares pueden compartir la misma barbería. */
  maxDispositivos: number;
}

const PLANES: Record<Plan, Capacidades> = {
  trial: { respaldoNube: false, syncVivo: false, reservasCloud: false, maxDispositivos: 1 },
  pro: { respaldoNube: true, syncVivo: true, reservasCloud: false, maxDispositivos: 3 },
  full: { respaldoNube: true, syncVivo: true, reservasCloud: true, maxDispositivos: 99 },
};

export const PLAN_ORDEN: Plan[] = ['trial', 'pro', 'full'];

export const NOMBRE_PLAN: Record<Plan, string> = {
  trial: 'Trial',
  pro: 'Pro',
  full: 'Full',
};

function normalizar(plan?: string): Plan {
  const p = (plan ?? '').toLowerCase();
  return (PLAN_ORDEN as string[]).includes(p) ? (p as Plan) : 'trial';
}

/** Capacidades de un plan (cae en trial si el plan es desconocido). */
export function capacidades(plan?: string): Capacidades {
  return PLANES[normalizar(plan)];
}

/** Nombre lindo del plan para mostrar. */
export function nombrePlan(plan?: string): string {
  return NOMBRE_PLAN[normalizar(plan)];
}

/** Lista de beneficios de un plan, para mostrar en pantalla. */
export function beneficios(plan?: string): { texto: string; incluido: boolean }[] {
  const c = capacidades(plan);
  return [
    { texto: 'App completa (fichar, agenda, stats, clientes)', incluido: true },
    { texto: 'Respaldo automático en la nube', incluido: c.respaldoNube },
    {
      texto:
        c.maxDispositivos >= 99
          ? 'Datos en vivo entre celulares (sin límite)'
          : `Datos en vivo entre celulares (hasta ${c.maxDispositivos})`,
      incluido: c.syncVivo,
    },
    { texto: 'Reservas de Instagram en la agenda', incluido: c.reservasCloud },
  ];
}
