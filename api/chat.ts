// Función serverless (Vercel) que hace de proxy con la API de Claude.
// La API key vive como variable de entorno en Vercel (ANTHROPIC_API_KEY),
// nunca en el navegador. El front llama a POST /api/chat.
//
// Si no está la key, responde 501 y el front cae a la ayuda con FAQ.

/* eslint-disable @typescript-eslint/no-explicit-any */

const MODELO = 'claude-haiku-4-5-20251001';

const GUIA = `Sos el asistente de "Corte", una app para barberías (local-first, PWA).
Ayudás al barbero o al dueño, en español rioplatense informal (vos, tocá, fichá), breve y concreto.

Qué hace la app y dónde está cada cosa:
- Fichar (pestaña principal): anotar cada corte en 2 toques (servicio, precio, hora, medio de pago, cliente opcional). Muestra la lista del día y el total.
- Agenda: vista calendario por día (tocás un hueco y creás el turno) o lista. Turnos con datos del cliente. Botones para confirmar/recordar por WhatsApp y email. "Marcar hecho" ficha el corte solo. Bloqueos de horario para cursos/trámites.
- Google Calendar: en Ajustes se conecta con un OAuth Client ID de Google; ahí cada turno se crea en el Google Calendar del barbero e invita al cliente, y Google manda las notificaciones. Sin conectar, hay un link "Agregar a Google Calendar".
- Reservas públicas: el link (Ajustes → Link de reservas) va en Instagram; el cliente elige servicio, barbero, día y hora libre.
- Stats: dashboard por hoy/semana/mes con facturado, ticket promedio, actividad por día, medios de pago, servicios más pedidos y horas pico.
- Barbería (solo dueño): facturado del local, comisiones a pagar, neto del local y detalle por barbero. La comisión de cada barbero se edita en Ajustes.
- Ajustes: barberos (+% comisión), servicios y precios, horario semanal, conectar Google Calendar, link de reservas, cargar datos de demo, empezar de cero.

Reglas: no inventes funciones que no existen. Si te preguntan por números concretos y te paso datos del negocio, usalos; si no los tenés, decí que los mire en Stats. No más de 6-7 líneas por respuesta.`;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(501).json({ error: 'no_key' });
    return;
  }

  try {
    const { messages, contexto } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'empty' });
      return;
    }
    // Recortamos a los últimos 12 turnos para acotar tokens.
    const recientes = messages.slice(-12).map((m: any) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content ?? '').slice(0, 4000),
    }));
    const system = contexto ? `${GUIA}\n\nDatos del negocio ahora:\n${String(contexto).slice(0, 2000)}` : GUIA;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ model: MODELO, max_tokens: 700, system, messages: recientes }),
    });

    if (!r.ok) {
      const detail = await r.text();
      res.status(502).json({ error: 'upstream', detail: detail.slice(0, 500) });
      return;
    }
    const data = await r.json();
    const text =
      (data.content ?? [])
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('')
        .trim() || 'No pude generar una respuesta, probá de nuevo.';
    res.status(200).json({ text });
  } catch (e: any) {
    res.status(500).json({ error: 'server', detail: String(e?.message ?? e).slice(0, 300) });
  }
}
