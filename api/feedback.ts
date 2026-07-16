// Función serverless (Vercel) para recibir feedback de los barberos.
// Si hay un webhook configurado (FEEDBACK_WEBHOOK_URL, p. ej. un webhook de
// Discord), le reenvía el mensaje. Si no, responde 501 y el front cae a mail.

/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  const hook = process.env.FEEDBACK_WEBHOOK_URL;
  const { mensaje, tipo, barberia, barbero } = req.body || {};

  if (!mensaje || !String(mensaje).trim()) {
    res.status(400).json({ error: 'empty' });
    return;
  }
  if (!hook) {
    res.status(501).json({ error: 'no_webhook' });
    return;
  }

  const texto =
    `💈 **Feedback Corte** · ${tipo || 'comentario'}\n` +
    `Barbería: ${barberia || '—'}${barbero ? ` · ${barbero}` : ''}\n\n` +
    String(mensaje).slice(0, 1800);

  try {
    // Formato de webhook de Discord (campo "content"). Para Slack, cambiá a { text }.
    const r = await fetch(hook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: texto }),
    });
    if (!r.ok) {
      res.status(502).json({ error: 'webhook_failed' });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: 'server', detail: String(e?.message ?? e).slice(0, 300) });
  }
}
