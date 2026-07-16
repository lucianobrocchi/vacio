// Cliente del asistente IA y del feedback. Habla con las funciones
// serverless (/api/chat, /api/feedback) y tiene fallbacks para que la
// burbuja sirva aunque no haya API key ni webhook configurados.

import { cortesEntre } from '../db/cortes';
import { listarBarberos } from '../db/barberos';
import { totales, porServicio } from './stats';
import { rangoPeriodo } from './fecha';
import { formatPesos } from './format';
import type { Config } from '../db/types';

export const DEFAULT_FEEDBACK_EMAIL = 'lucianobrocchi@gmail.com';

export interface Mensaje {
  role: 'user' | 'assistant';
  content: string;
}

export class SinApiKey extends Error {}

/**
 * Le pregunta al asistente IA (vía /api/chat). Si el server no tiene la key
 * (501), tira SinApiKey para que el front use la ayuda con FAQ.
 */
export async function preguntarAsistente(messages: Mensaje[], contexto?: string): Promise<string> {
  const resp = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages, contexto }),
  });
  if (resp.status === 501) throw new SinApiKey();
  if (!resp.ok) throw new Error(`chat ${resp.status}`);
  const data = await resp.json();
  return data.text as string;
}

/** Snapshot compacto del negocio para darle contexto al IA. */
export async function construirContexto(): Promise<string> {
  const barberos = await listarBarberos(true);
  const partes: string[] = [`Barberos: ${barberos.map((b) => `${b.nombre} (${b.comision}%)`).join(', ') || '—'}.`];
  for (const p of ['hoy', 'semana', 'mes'] as const) {
    const [desde, hasta] = rangoPeriodo(p);
    const cortes = await cortesEntre(desde, hasta);
    const t = totales(cortes);
    const top = porServicio(cortes)
      .slice(0, 3)
      .map((s) => `${s.servicioNombre} ${s.cortes}`)
      .join(', ');
    partes.push(
      `${p}: ${t.cortes} cortes, facturado ${formatPesos(t.facturado)}, ` +
        `efectivo ${formatPesos(t.efectivo)}, transferencia ${formatPesos(t.transferencia)}` +
        (top ? `, top: ${top}` : '') +
        '.',
    );
  }
  return partes.join('\n');
}

/** Ayuda con respuestas fijas (fallback sin IA). Matchea por palabras clave. */
const FAQ: { claves: string[]; r: string }[] = [
  {
    claves: ['fichar', 'anotar', 'corte', 'cobr'],
    r: 'Para fichar un corte: pestaña **Fichar** → "Fichar corte" → elegí servicio, hora y medio de pago, y listo. Aparece en la lista del día y suma al total.',
  },
  {
    claves: ['turno', 'agenda', 'reserv', 'cita'],
    r: 'En **Agenda** tocás un hueco de la grilla (o el botón "Turno") y cargás los datos del cliente. Después lo confirmás por WhatsApp/email, y al terminarlo tocás "Hecho" y se ficha solo.',
  },
  {
    claves: ['google', 'calendar', 'calendario', 'notificac'],
    r: 'Conectá Google Calendar en **Ajustes → Google Calendar** (necesitás un OAuth Client ID de Google, hay pasos ahí). Una vez conectado, cada turno se agenda en tu Google y le llega la invitación/recordatorio al cliente y a vos.',
  },
  {
    claves: ['comision', 'comisión', 'dueñ', 'barberia', 'barbería', 'ganancia', 'facturado'],
    r: 'En **Barbería** (panel del dueño) ves el facturado del local, las comisiones a pagar y lo que queda para la barbería, con el detalle por barbero. El % de comisión se edita en **Ajustes → Barberos**.',
  },
  {
    claves: ['stats', 'estadistic', 'número', 'numero', 'promedio'],
    r: 'En **Stats** tenés facturado, ticket promedio, actividad por día, medios de pago, servicios más pedidos y horas pico. Cambiá entre Hoy / Semana / Mes arriba.',
  },
  {
    claves: ['link', 'instagram', 'cliente', 'compart'],
    r: 'Tu link de reservas está en **Ajustes → Link de reservas**. Copialo y ponelo en tu Instagram: el cliente elige servicio, día y hora libres solo.',
  },
  {
    claves: ['demo', 'ejemplo', 'prob'],
    r: 'En **Ajustes → Cargar datos de demo** llenás la app con ~3 semanas de cortes y turnos para ver todo funcionando. Se saca con "Empezar de cero".',
  },
];

export function respuestaFAQ(pregunta: string): string {
  const q = pregunta.toLowerCase();
  const hit = FAQ.find((f) => f.claves.some((c) => q.includes(c)));
  return (
    hit?.r ??
    'Puedo ayudarte con: fichar cortes, la agenda y los turnos, conectar Google Calendar, tus stats, las comisiones y el link de reservas. ¿Sobre cuál querés saber?'
  );
}

export interface ResultadoFeedback {
  via: 'webhook' | 'mailto';
  url?: string;
}

/** Manda el feedback al webhook; si no hay, devuelve un mailto de respaldo. */
export async function enviarFeedback(
  config: Config,
  datos: { mensaje: string; tipo: string; barbero?: string },
): Promise<ResultadoFeedback> {
  try {
    const resp = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...datos, barberia: config.nombreBarberia }),
    });
    if (resp.ok) return { via: 'webhook' };
  } catch {
    // sin conexión → mailto
  }
  const dest = config.feedbackEmail?.trim() || DEFAULT_FEEDBACK_EMAIL;
  const asunto = `Feedback Corte — ${config.nombreBarberia || 'barbería'}`;
  const cuerpo = `[${datos.tipo}] ${datos.barbero ? `(${datos.barbero}) ` : ''}\n\n${datos.mensaje}`;
  const url = `mailto:${dest}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
  return { via: 'mailto', url };
}
