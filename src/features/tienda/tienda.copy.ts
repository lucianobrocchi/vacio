// Textos de la tienda pública (la ve el cliente desde el link del barbero).

export const copy = {
  titulo: 'Productos',
  de: (nombre: string) => `Con ${nombre}`,
  vacio: 'Por ahora no hay productos disponibles.',
  noEncontrado: 'No encontramos este link. Pedile uno nuevo a tu barbero.',
  sinStock: 'Sin stock',
  ultima: '¡Última unidad!',
  quedan: (n: number) => `Quedan ${n}`,
  agregar: 'Agregar',
  quitar: 'Quitar',
  tuPedido: 'Tu pedido',
  total: 'Total',
  nombre: 'Tu nombre (opcional)',
  nombrePh: 'Cómo te llamás',
  pedir: 'Pedir por WhatsApp',
  sinWhatsapp: 'Este barbero todavía no cargó su WhatsApp. Escribile por Instagram.',
  ayuda: 'Le mandás el pedido por WhatsApp y coordinan la entrega y el pago.',
  reservar: '¿Querés un turno? Reservá acá',
};
