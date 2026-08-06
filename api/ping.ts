// Endpoint de control, SIN imports. Sirve para aislar si el problema es del
// runtime (type:module / Node) o del import de ./_supabase.
//   https://TU-DOMINIO/api/ping
/* eslint-disable @typescript-eslint/no-explicit-any */
export default function handler(_req: any, res: any) {
  res.status(200).json({
    ok: true,
    node: process.version,
    tiene_fetch: typeof fetch !== 'undefined',
    tiene_AbortController: typeof AbortController !== 'undefined',
  });
}
