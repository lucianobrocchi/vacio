import { useEffect, useRef, useState } from 'react';
import {
  preguntarAsistente,
  construirContexto,
  respuestaFAQ,
  enviarFeedback,
  SinApiKey,
  type Mensaje,
} from '../lib/asistente';
import { IconoChispa, IconoCerrar, IconoEnviar } from './Iconos';
import type { Config } from '../db/types';

type Tab = 'asistente' | 'feedback';
const TIPOS = [
  { id: 'idea', label: '💡 Idea' },
  { id: 'problema', label: '🐞 Problema' },
  { id: 'otro', label: '💬 Otro' },
];

const SALUDO: Mensaje = {
  role: 'assistant',
  content: '¡Hola! Soy tu asistente. Preguntame cómo usar Corte o por tus números (ej: "¿cuánto facturé esta semana?").',
};

/** Render mínimo de **negrita** e _itálica_ (sin dependencias). */
function renderInline(texto: string) {
  return texto.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('_') && p.endsWith('_'))
      return (
        <em key={i} className="opacity-70">
          {p.slice(1, -1)}
        </em>
      );
    return <span key={i}>{p}</span>;
  });
}

export function AsistenteBurbuja({ config }: { config: Config }) {
  const [abierto, setAbierto] = useState(false);
  const [tab, setTab] = useState<Tab>('asistente');

  // Chat
  const [mensajes, setMensajes] = useState<Mensaje[]>([SALUDO]);
  const [input, setInput] = useState('');
  const [cargando, setCargando] = useState(false);
  const [modoBasico, setModoBasico] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, cargando]);

  async function enviar() {
    const texto = input.trim();
    if (!texto || cargando) return;
    const userMsg: Mensaje = { role: 'user', content: texto };
    const nuevos = [...mensajes, userMsg];
    setMensajes(nuevos);
    setInput('');
    setCargando(true);

    if (modoBasico) {
      setTimeout(() => {
        setMensajes((m) => [...m, { role: 'assistant', content: respuestaFAQ(texto) }]);
        setCargando(false);
      }, 250);
      return;
    }
    try {
      const contexto = await construirContexto();
      const text = await preguntarAsistente(nuevos.filter((m) => m !== SALUDO), contexto);
      setMensajes((m) => [...m, { role: 'assistant', content: text }]);
    } catch (e) {
      if (e instanceof SinApiKey) {
        setModoBasico(true);
        setMensajes((m) => [
          ...m,
          {
            role: 'assistant',
            content:
              respuestaFAQ(texto) +
              '\n\n_(El asistente IA completo se activa cuando cargues la ANTHROPIC_API_KEY en Vercel. Por ahora te ayudo con lo básico.)_',
          },
        ]);
      } else {
        // Error transitorio (sin red / función caída): respondo con la ayuda
        // rápida pero no bloqueo el modo IA (reintenta la próxima).
        setMensajes((m) => [
          ...m,
          {
            role: 'assistant',
            content: respuestaFAQ(texto) + '\n\n_(Te respondí con la ayuda rápida; el asistente completo no estaba disponible ahora.)_',
          },
        ]);
      }
    } finally {
      setCargando(false);
    }
  }

  // Feedback
  const [tipo, setTipo] = useState('idea');
  const [fbTexto, setFbTexto] = useState('');
  const [fbEstado, setFbEstado] = useState<'idle' | 'enviando' | 'ok' | 'mail'>('idle');

  async function mandarFeedback() {
    if (!fbTexto.trim() || fbEstado === 'enviando') return;
    setFbEstado('enviando');
    const res = await enviarFeedback(config, { mensaje: fbTexto.trim(), tipo });
    if (res.via === 'mailto' && res.url) {
      window.location.href = res.url;
      setFbEstado('mail');
    } else {
      setFbEstado('ok');
    }
    setFbTexto('');
    setTimeout(() => setFbEstado('idle'), 4000);
  }

  return (
    <>
      {/* Burbuja flotante */}
      {!abierto && (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Asistente y feedback"
          className="fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-oro to-oro-dark text-carbon-900 shadow-lg transition active:scale-95"
          style={{ bottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom) + 0.75rem)' }}
        >
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-oro/40" style={{ animationDuration: '2.5s' }} />
          <IconoChispa filled width={26} height={26} />
        </button>
      )}

      {/* Panel */}
      {abierto && (
        <div className="fixed inset-0 z-40 flex items-end justify-center">
          <div className="animate-fade absolute inset-0 bg-carbon-900/40" onClick={() => setAbierto(false)} aria-hidden />
          <div
            className="animate-sheet relative flex w-full max-w-md flex-col rounded-t-3xl bg-carbon-50 shadow-sheet"
            style={{ height: '86dvh', paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Header + tabs */}
            <div className="flex items-center justify-between px-4 pt-4">
              <div className="flex items-center gap-2 font-display text-lg font-extrabold text-carbon-900">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-oro text-carbon-900">
                  <IconoChispa filled width={17} height={17} />
                </span>
                Asistente
              </div>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
                className="rounded-full p-2 text-carbon-900/50 active:bg-carbon-100"
              >
                <IconoCerrar width={22} height={22} />
              </button>
            </div>
            <div className="mx-4 mt-3 flex rounded-xl bg-carbon-100 p-1 text-sm font-semibold">
              {(['asistente', 'feedback'] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`flex-1 rounded-lg py-2 transition ${
                    tab === t ? 'bg-white text-carbon shadow-card' : 'text-carbon-900/50'
                  }`}
                >
                  {t === 'asistente' ? 'Chat' : 'Feedback'}
                </button>
              ))}
            </div>

            {tab === 'asistente' ? (
              <>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
                  {mensajes.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm ${
                          m.role === 'user'
                            ? 'rounded-br-md bg-carbon text-white'
                            : 'rounded-bl-md bg-white text-carbon-900 shadow-card'
                        }`}
                      >
                        {m.role === 'assistant' ? renderInline(m.content) : m.content}
                      </div>
                    </div>
                  ))}
                  {cargando && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-card">
                        <span className="flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <span
                              key={i}
                              className="h-1.5 w-1.5 animate-bounce rounded-full bg-carbon-900/40"
                              style={{ animationDelay: `${i * 0.15}s` }}
                            />
                          ))}
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={finRef} />
                </div>
                <div className="flex items-end gap-2 border-t border-carbon/10 bg-carbon-50 p-3">
                  <textarea
                    className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl border-2 border-carbon/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-carbon"
                    rows={1}
                    placeholder="Escribí tu pregunta…"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        enviar();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={enviar}
                    disabled={!input.trim() || cargando}
                    aria-label="Enviar"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-carbon text-white transition active:scale-95 disabled:opacity-40"
                  >
                    <IconoEnviar width={20} height={20} />
                  </button>
                </div>
              </>
            ) : (
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                <p className="text-sm text-carbon-900/60">
                  ¿Algo para mejorar, un problema o una idea? Contame y me llega.
                </p>
                <div className="flex gap-2">
                  {TIPOS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTipo(t.id)}
                      className={`flex-1 rounded-xl border-2 py-2 text-sm font-semibold transition ${
                        tipo === t.id ? 'border-carbon bg-carbon text-white' : 'border-carbon/15 bg-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <textarea
                  className="min-h-[140px] w-full resize-none rounded-2xl border-2 border-carbon/15 bg-white px-4 py-3 text-base outline-none focus:border-carbon"
                  placeholder="Escribí acá tu comentario…"
                  value={fbTexto}
                  onChange={(e) => setFbTexto(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-primario"
                  disabled={!fbTexto.trim() || fbEstado === 'enviando'}
                  onClick={mandarFeedback}
                >
                  {fbEstado === 'enviando' ? 'Enviando…' : 'Enviar feedback'}
                </button>
                {fbEstado === 'ok' && (
                  <p className="text-center text-sm font-semibold text-ok">¡Gracias! Lo recibí. 🙌</p>
                )}
                {fbEstado === 'mail' && (
                  <p className="text-center text-sm font-semibold text-confirmado">
                    Te abrí el mail para enviarlo ✉️
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
