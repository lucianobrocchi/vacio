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
  desglose: {
    titulo: 'De dónde viene la plata',
    servicios: 'Cortes y servicios',
    productos: 'Productos',
    unidades: (n: number) => (n === 1 ? '1 unidad' : `${n} unidades`),
  },
  caja: {
    titulo: 'Cómo te pagaron',
    efectivo: 'Efectivo',
    transferencia: 'Transferencia',
  },
  cuenta: {
    titulo: 'La cuenta final',
    bruto: 'Facturación total',
    costoMercaderia: 'Costo de la mercadería',
    comisiones: 'Comisiones de barberos',
    neto: 'Ganancia del local',
    ayuda: 'Facturado − lo que costó la mercadería − las comisiones.',
  },
  porBarbero: 'Detalle por barbero',
  col: { factura: 'Factura', comision: 'Comisión', neto: 'Local' },
  colProd: 'Productos',
  detalle: {
    kpis: { facturado: 'Facturado', cortes: 'Cortes', ticket: 'Ticket prom.', comision: 'Su comisión' },
    tendencia: 'Su facturación',
    servicios: 'Sus servicios top',
    clientes: 'Sus clientes',
    clientesUnicos: (n: number) => (n === 1 ? '1 cliente atendido' : `${n} clientes atendidos`),
    topClientes: 'Los que más gastaron',
    visitas: (n: number) => (n === 1 ? '1 visita' : `${n} visitas`),
    sinDatos: 'Sin cortes en este período.',
  },
  turnosHoy: 'Próximos turnos de hoy',
  sinTurnosHoy: 'No hay turnos agendados para hoy.',
  vacio: 'Sin cortes en este período todavía.',
  tipComision: 'La comisión de cada barbero se edita en Ajustes → Barberos.',
};
