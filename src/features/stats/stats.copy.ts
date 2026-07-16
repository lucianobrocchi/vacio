// Textos del dashboard de estadísticas.

export const copy = {
  titulo: 'Stats',
  periodos: { hoy: 'Hoy', semana: 'Semana', mes: 'Mes' } as const,
  hero: {
    facturado: 'Facturado',
    vsHoy: 'vs. ayer',
    vsSemana: 'vs. semana pasada',
    vsMes: 'vs. mes pasado',
    cortes: (n: number) => (n === 1 ? '1 corte' : `${n} cortes`),
    prom: 'prom.',
  },
  kpis: {
    cortes: 'Cortes',
    promedio: 'Ticket promedio',
    porDia: 'Promedio / día',
    mejorDia: 'Mejor día',
  },
  medios: { titulo: 'Cómo te pagaron', efectivo: 'Efectivo', transferencia: 'Transferencia' },
  actividad: 'Actividad por día',
  servicios: 'Servicios más pedidos',
  horasPico: 'Tus horas pico',
  sinHoras: 'Sin datos de horario todavía.',
  vacio: {
    titulo: 'Todavía no hay números',
    bajada: 'Fichá tu primer corte del período y esto se llena de data.',
  },
};
