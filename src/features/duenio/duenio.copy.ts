// Textos del panel del dueño.

export const copy = {
  titulo: 'Barbería',
  periodos: { hoy: 'Hoy', semana: 'Semana', mes: 'Mes' } as const,
  kpis: {
    facturado: 'Facturado total',
    cortes: 'Cortes',
    turnosProximos: 'Turnos próximos',
  },
  vsAnterior: (v: number) => `${v > 0 ? '+' : ''}${Math.round(v)}% vs. anterior`,
  porBarbero: 'Por barbero',
  turnosHoy: 'Turnos de hoy (todos)',
  sinTurnosHoy: 'No hay turnos agendados para hoy.',
  vacio: 'Sin cortes en este período todavía.',
};
