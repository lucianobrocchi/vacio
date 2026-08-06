// Textos de la pantalla Fichar.

export const copy = {
  titulo: 'Fichar',
  saludo: (nombre: string) => `Hola, ${nombre}`,
  hoy: {
    cortes: (n: number) => (n === 1 ? '1 corte' : `${n} cortes`),
    efectivo: 'Efectivo',
    transferencia: 'Transf.',
  },
  ficharCorte: 'Fichar corte',
  vacio: {
    titulo: 'Todavía no fichaste nada hoy',
    bajada: 'Terminás un corte, lo fichás. Dos toques y listo.',
  },
  sheet: {
    tituloNuevo: 'Fichar corte',
    productos: '¿Se llevó algo?',
    sumar: 'Sumar',
    ficharTotal: (t: number) => `Fichar · $ ${t.toLocaleString('es-AR')}`,
    tituloEditar: 'Editar corte',
    servicio: 'Servicio',
    precio: 'Precio',
    medio: 'Medio de pago',
    efectivo: 'Efectivo',
    transferencia: 'Transferencia',
    hora: 'Hora',
    cliente: 'Cliente (opcional)',
    clientePlaceholder: 'Juan',
    fichar: 'Fichar',
    guardar: 'Guardar cambios',
    borrar: 'Borrar corte',
    confirmarBorrar: '¿Borrar este corte? No se puede deshacer.',
    sinServicios: 'No hay servicios cargados. Agregalos en Ajustes.',
  },
};
