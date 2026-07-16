// Textos del panel del dueño.

export const copy = {
  titulo: 'Barbería',
  periodos: { hoy: 'Hoy', semana: 'Semana', mes: 'Mes' } as const,
  facturadoTotal: 'Facturado del local',
  vsAnterior: (v: number) => `${v > 0 ? '+' : ''}${Math.round(v)}%`,
  resumen: {
    comisiones: 'Comisiones a pagar',
    neto: 'Queda para el local',
    cortes: 'Cortes',
  },
  porBarbero: 'Detalle por barbero',
  col: { factura: 'Factura', comision: 'Comisión', neto: 'Local' },
  turnosHoy: 'Próximos turnos de hoy',
  sinTurnosHoy: 'No hay turnos agendados para hoy.',
  vacio: 'Sin cortes en este período todavía.',
  tipComision: 'La comisión de cada barbero se edita en Ajustes → Barberos.',
};
