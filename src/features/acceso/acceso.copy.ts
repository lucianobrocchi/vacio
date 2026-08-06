// Textos de la pantalla de acceso (elegir barbero + PIN).

export const copy = {
  titulo: '¿Quién sos?',
  bajada: 'Elegí tu nombre para entrar con tu cuenta.',
  duenio: 'dueño',
  pinTitulo: (nombre: string) => `Hola, ${nombre}`,
  pinBajada: 'Ingresá tu PIN de 4 dígitos.',
  pinIncorrecto: 'PIN incorrecto. Probá de nuevo.',
  entrar: 'Entrar',
  volver: 'No soy yo',
  sinBarberos: 'Todavía no hay barberos cargados en esta barbería.',
  ayuda: 'Si no sabés tu PIN, pedíselo al dueño de la barbería.',
};
