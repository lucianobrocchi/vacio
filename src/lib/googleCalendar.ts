// Integración con Google Calendar desde el navegador (sin backend).
//
// Usa Google Identity Services (GIS) para pedir un access token con el scope
// de calendario, y después llama a la Calendar REST API directo desde el
// cliente. Al crear el evento con el cliente como invitado (`attendees`) y
// `sendUpdates=all`, Google se encarga de mandar el mail de invitación y las
// notificaciones/recordatorios al barbero y al cliente. Tipo Wonoma/Booksy.
//
// Requisito: un OAuth Client ID (gratis, Google Cloud Console) con el dominio
// de la app como "authorized JavaScript origin". Se carga en Ajustes.
// El Client ID NO es secreto: va tranquilo en el frontend.

import { timestampDe } from './fecha';
import { formatPesos } from './format';
import type { Turno } from '../db/types';

/**
 * Client ID efectivo: el de la app (VITE_GOOGLE_CLIENT_ID, lo configura el
 * administrador UNA vez en Vercel y vale para todas las barberías) o, si
 * alguien cargó uno propio en Ajustes → avanzado, ese.
 */
export function clientIdEfectivo(config?: { googleClientId?: string }): string {
  const propio = config?.googleClientId?.trim();
  const compartido = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim();
  return propio || compartido || '';
}

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const LS_TOKEN = 'corte.gcal.token';

interface TokenGuardado {
  accessToken: string;
  /** Epoch ms de expiración. */
  expira: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any;
  }
}

let gisPromise: Promise<void> | null = null;

/** Carga el script de Google Identity Services una sola vez. */
function cargarGIS(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('No se pudo cargar Google (¿sin internet?).'));
    document.head.appendChild(s);
  });
  return gisPromise;
}

function leerToken(): TokenGuardado | null {
  try {
    const raw = localStorage.getItem(LS_TOKEN);
    return raw ? (JSON.parse(raw) as TokenGuardado) : null;
  } catch {
    return null;
  }
}

function guardarToken(t: TokenGuardado | null) {
  if (t) localStorage.setItem(LS_TOKEN, JSON.stringify(t));
  else localStorage.removeItem(LS_TOKEN);
}

/** ¿Hay un token válido (no vencido) guardado? */
export function googleConectado(): boolean {
  const t = leerToken();
  return !!t && t.expira > Date.now() + 30_000;
}

/**
 * Pide un access token. Si `interactivo`, muestra el popup de consentimiento;
 * si no, intenta en silencio (para usuarios que ya autorizaron).
 */
function pedirToken(clientId: string, interactivo: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      prompt: interactivo ? 'consent' : '',
      callback: (resp: any) => {
        if (resp.error) {
          reject(new Error(resp.error));
          return;
        }
        const expira = Date.now() + (resp.expires_in ?? 3600) * 1000;
        guardarToken({ accessToken: resp.access_token, expira });
        resolve(resp.access_token);
      },
      error_callback: (err: any) => reject(new Error(err?.type ?? 'Falló la conexión con Google.')),
    });
    client.requestAccessToken();
  });
}

/** Conecta la cuenta de Google (con popup de consentimiento). */
export async function conectarGoogle(clientId: string): Promise<void> {
  await cargarGIS();
  await pedirToken(clientId, true);
}

/** Desconecta: borra el token local (no revoca el permiso en Google). */
export function desconectarGoogle(): void {
  guardarToken(null);
}

/** Devuelve un token válido, refrescándolo en silencio si hace falta. */
async function tokenValido(clientId: string): Promise<string> {
  const t = leerToken();
  if (t && t.expira > Date.now() + 30_000) return t.accessToken;
  await cargarGIS();
  return pedirToken(clientId, false);
}

/** Wall-clock local "YYYY-MM-DDTHH:mm:00" a partir de un timestamp. */
function wallClock(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(
    d.getMinutes(),
  )}:00`;
}

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Argentina/Buenos_Aires';

function cuerpoEvento(turno: Turno, nombreBarberia: string) {
  const inicio = timestampDe(turno.dia, turno.hora);
  const fin = inicio + turno.duracionMin * 60_000;
  const attendees = turno.clienteEmail ? [{ email: turno.clienteEmail }] : undefined;
  return {
    summary: `${turno.servicioNombre} — ${turno.clienteNombre}`,
    location: nombreBarberia,
    description:
      `${turno.servicioNombre} · ${formatPesos(turno.precio)}\n` +
      `Cliente: ${turno.clienteNombre}` +
      (turno.clienteTelefono ? ` · ${turno.clienteTelefono}` : '') +
      (turno.nota ? `\nNota: ${turno.nota}` : '') +
      `\n\nAgendado con Corte.`,
    start: { dateTime: wallClock(inicio), timeZone: TZ },
    end: { dateTime: wallClock(fin), timeZone: TZ },
    attendees,
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 60 },
      ],
    },
  };
}

/**
 * Crea el evento en el Google Calendar del barbero e invita al cliente.
 * Devuelve el ID del evento (para poder actualizarlo/cancelarlo después).
 */
export async function crearEventoGoogle(
  clientId: string,
  turno: Turno,
  nombreBarberia: string,
): Promise<string> {
  const token = await tokenValido(clientId);
  const resp = await fetch(`${API}?sendUpdates=all`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpoEvento(turno, nombreBarberia)),
  });
  if (!resp.ok) throw new Error(`Google Calendar: ${resp.status}`);
  const data = await resp.json();
  return data.id as string;
}

/** Actualiza un evento ya creado (reprogramación, cambio de servicio). */
export async function actualizarEventoGoogle(
  clientId: string,
  eventId: string,
  turno: Turno,
  nombreBarberia: string,
): Promise<void> {
  const token = await tokenValido(clientId);
  const resp = await fetch(`${API}/${encodeURIComponent(eventId)}?sendUpdates=all`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpoEvento(turno, nombreBarberia)),
  });
  if (!resp.ok) throw new Error(`Google Calendar: ${resp.status}`);
}

/** Cancela (borra) el evento y avisa al cliente. */
export async function borrarEventoGoogle(clientId: string, eventId: string): Promise<void> {
  const token = await tokenValido(clientId);
  const resp = await fetch(`${API}/${encodeURIComponent(eventId)}?sendUpdates=all`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  // 410 = ya estaba borrado; lo tratamos como OK.
  if (!resp.ok && resp.status !== 410) throw new Error(`Google Calendar: ${resp.status}`);
}

/**
 * Fallback sin conexión OAuth: link que abre Google Calendar con el evento
 * pre-cargado. El barbero lo guarda a mano; si suma al cliente como invitado,
 * Google le manda la invitación igual.
 */
export function linkAgregarAGoogle(turno: Turno, nombreBarberia: string): string {
  const inicio = new Date(timestampDe(turno.dia, turno.hora));
  const fin = new Date(inicio.getTime() + turno.duracionMin * 60_000);
  const fmt = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${turno.servicioNombre} — ${turno.clienteNombre}`,
    dates: `${fmt(inicio)}/${fmt(fin)}`,
    details:
      `${turno.servicioNombre} · ${formatPesos(turno.precio)}` +
      (turno.clienteTelefono ? `\nTel: ${turno.clienteTelefono}` : ''),
    location: nombreBarberia,
  });
  if (turno.clienteEmail) params.set('add', turno.clienteEmail);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
