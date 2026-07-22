// Textos de la cartera de clientes.

export const copy = {
  titulo: 'Clientes',
  subtitulo: (n: number) => (n === 1 ? '1 cliente en tu cartera' : `${n} clientes en tu cartera`),
  buscar: 'Buscar cliente…',
  filtros: {
    todos: 'Todos',
    frecuente: 'Frecuentes',
    enRiesgo: 'En riesgo',
    nuevo: 'Nuevos',
  } as Record<string, string>,
  fila: {
    vieneCada: (d: number) => `Viene cada ~${d} días`,
    unaVisita: '1 visita',
    visitas: (n: number) => `${n} visitas`,
    hace: (d: number) => (d === 0 ? 'hoy' : d === 1 ? 'ayer' : `hace ${d} días`),
    turnoProximo: 'Tiene turno',
  },
  vacio: {
    titulo: 'Tu cartera se arma sola',
    bajada:
      'Cuando fichás cortes con el nombre del cliente o agendás turnos, acá aparece cada cliente con su frecuencia, última visita y gasto.',
  },
  sinResultados: 'Ningún cliente con esa búsqueda.',
  detalle: {
    kpis: {
      visitas: 'Visitas',
      frecuencia: 'Viene cada',
      dias: 'días',
      gastado: 'Gastado',
      ultima: 'Última visita',
    },
    heatmap: 'Sus visitas · últimas 16 semanas',
    proximo: 'Próximo turno',
    historial: 'Últimas visitas',
    whatsapp: 'WhatsApp',
    reenganche: 'Invitarlo a volver',
    email: 'Email',
    estados: {
      frecuente: '⭐ Cliente frecuente',
      enRiesgo: '⚠️ Hace mucho que no viene',
      nuevo: '✨ Cliente nuevo',
      normal: '',
    } as Record<string, string>,
  },
};
