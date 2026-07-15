// Textos del dashboard de estadísticas.

export const copy = {
  titulo: 'Stats',
  periodos: { hoy: 'Hoy', semana: 'Semana', mes: 'Mes' } as const,
  kpis: {
    cortes: 'Cortes',
    facturado: 'Facturado',
    promedio: 'Prom. por corte',
    porDia: 'Prom. por día',
  },
  vsAnterior: (v: number) => `${v > 0 ? '+' : ''}${Math.round(v)}% vs. anterior`,
  medios: { titulo: 'Cómo te pagaron', efectivo: 'Efectivo', transferencia: 'Transferencia' },
  graficoDias: 'Cortes por día',
  mejorDia: 'Mejor día',
  servicios: 'Tus servicios',
  horasPico: 'Horas pico',
  vacio: 'Sin cortes en este período. Fichá el primero y esto se llena solo.',
};
