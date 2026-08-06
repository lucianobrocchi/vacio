// Mensajes al cliente: WhatsApp (wa.me) y email (mailto).
// Sin backend, la app abre WhatsApp/mail con el mensaje ya escrito y el
// barbero solo toca "enviar". El envío automático llega con la Fase 2.

import { formatFechaLarga } from './fecha';
import { formatPesos } from './format';
import type { Turno } from '../db/types';

/**
 * Normaliza un teléfono argentino a formato wa.me: 549 + área + número.
 * "11 5555-1234" → "5491155551234". Si ya viene con 54, lo respeta.
 */
export function normalizarTelefono(telefono: string): string {
  let digitos = telefono.replace(/\D/g, '');
  if (digitos.startsWith('00')) digitos = digitos.slice(2);
  if (digitos.startsWith('0')) digitos = digitos.slice(1);
  if (digitos.startsWith('549')) return digitos;
  if (digitos.startsWith('54')) return `549${digitos.slice(2)}`;
  if (digitos.startsWith('15')) digitos = digitos.slice(2);
  return `549${digitos}`;
}

export function linkWhatsApp(telefono: string, texto: string): string {
  return `https://wa.me/${normalizarTelefono(telefono)}?text=${encodeURIComponent(texto)}`;
}

export function linkEmail(email: string, asunto: string, cuerpo: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
}

/** Mensaje de confirmación de turno, listo para mandar. */
export function mensajeConfirmacion(turno: Turno, nombreBarberia: string): string {
  return (
    `¡Hola ${turno.clienteNombre}! Te confirmo el turno en ${nombreBarberia}:\n\n` +
    `📅 ${formatFechaLarga(turno.dia)}\n` +
    `🕐 ${turno.hora} hs\n` +
    `✂️ ${turno.servicioNombre} — ${formatPesos(turno.precio)}\n\n` +
    `Si no llegás, avisame por acá así le doy el lugar a otro. ¡Te espero!`
  );
}

/** Recordatorio para mandar el día anterior o unas horas antes. */
export function mensajeRecordatorio(turno: Turno, nombreBarberia: string): string {
  return (
    `¡Hola ${turno.clienteNombre}! Te recuerdo tu turno en ${nombreBarberia}: ` +
    `${formatFechaLarga(turno.dia)} a las ${turno.hora} hs (${turno.servicioNombre}). ` +
    `¡Nos vemos!`
  );
}

/** Mensaje de reenganche para clientes que hace mucho no vienen. */
export function mensajeReenganche(nombreCliente: string, nombreBarberia: string): string {
  return (
    `¡Hola ${nombreCliente}! ¿Cómo va? Hace un tiempito que no pasás por ${nombreBarberia} ✂️\n` +
    `Cuando quieras te guardo un turno. ¡Te esperamos!`
  );
}

export function asuntoEmail(turno: Turno, nombreBarberia: string): string {
  return `Turno confirmado en ${nombreBarberia} — ${formatFechaLarga(turno.dia)} ${turno.hora} hs`;
}

/** El link público de reservas de esta instalación. */
export function linkReservas(): string {
  return `${location.origin}${location.pathname}#/reservar`;
}

/**
 * Link de invitación para un barbero: trae el código de la barbería y quién
 * es, así el barbero solo pone su PIN. Nunca ve "crear barbería".
 */
export function linkInvitacion(codigo: string, barberoUuid: string): string {
  return `${location.origin}${location.pathname}#/unirse?c=${encodeURIComponent(
    codigo,
  )}&b=${encodeURIComponent(barberoUuid)}`;
}

/** Mensaje listo para mandarle al barbero por WhatsApp. */
export function mensajeInvitacion(
  nombre: string,
  nombreBarberia: string,
  link: string,
  pin: string,
): string {
  return (
    `¡Hola ${nombre}! Ya tenés tu cuenta en ${nombreBarberia} 💈\n\n` +
    `1) Entrá acá: ${link}\n` +
    `2) Poné tu PIN: ${pin}\n\n` +
    `Listo. Ahí fichás tus cortes, ves tus estadísticas y tenés tu link de turnos.`
  );
}

/** Link de reservas apuntando a un barbero (queda preseleccionado). */
export function linkReservasBarbero(barberoUuid: string): string {
  return `${linkReservas()}?b=${encodeURIComponent(barberoUuid)}`;
}

/** Link público de la tienda de un barbero (sus productos). */
export function linkTienda(barberoUuid: string): string {
  return `${location.origin}${location.pathname}#/tienda?b=${encodeURIComponent(barberoUuid)}`;
}

/** Pedido de productos que el cliente le manda al barbero por WhatsApp. */
export function mensajePedido(
  items: { nombre: string; cantidad: number; precio: number }[],
  nombreBarbero: string,
  nombreCliente?: string,
): string {
  const lineas = items
    .map((i) => `• ${i.cantidad}× ${i.nombre} — ${formatPesos(i.precio * i.cantidad)}`)
    .join('\n');
  const total = items.reduce((a, i) => a + i.precio * i.cantidad, 0);
  return (
    `¡Hola ${nombreBarbero}! Te quería encargar:\n\n${lineas}\n\n` +
    `Total: ${formatPesos(total)}\n` +
    (nombreCliente ? `Soy ${nombreCliente}. ` : '') +
    `¿Los tenés?`
  );
}
