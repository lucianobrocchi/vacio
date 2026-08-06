import type { SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement> & { filled?: boolean };

function base(props: Props) {
  const { filled: _filled, ...rest } = props;
  return {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...rest,
  };
}

/** Tijera — Fichar. */
export function IconoTijera(props: Props) {
  return (
    <svg {...base(props)}>
      <circle cx="6" cy="6" r="3" fill={props.filled ? 'currentColor' : 'none'} />
      <circle cx="6" cy="18" r="3" fill={props.filled ? 'currentColor' : 'none'} />
      <path d="M8.5 8.5 20 20M8.5 15.5 20 4" />
    </svg>
  );
}

/** Botella/producto — Stock. */
export function IconoProducto(props: Props) {
  return (
    <svg {...base(props)}>
      <path d="M10 2h4v3l1.6 2.4a3 3 0 0 1 .4 1.5V20a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V8.9c0-.5.1-1 .4-1.5L10 5V2Z" />
      <path d="M8 13h8" fill="none" />
    </svg>
  );
}

/** Calendario — Agenda. */
export function IconoCalendario(props: Props) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="5" width="18" height="16" rx="3" fill={props.filled ? 'currentColor' : 'none'} />
      <path d="M8 3v4M16 3v4M3 10h18" stroke={props.filled ? 'white' : 'currentColor'} />
    </svg>
  );
}

/** Barras — Stats. */
export function IconoStats(props: Props) {
  return (
    <svg {...base(props)} strokeWidth={props.filled ? 3.4 : 2.4}>
      <path d="M5 20V14M12 20V8M19 20V4" />
    </svg>
  );
}

/** Local — Barbería (panel del dueño). */
export function IconoLocal(props: Props) {
  return (
    <svg {...base(props)}>
      <path
        d="M4 9 5.5 4h13L20 9M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9M4 9h16"
        fill={props.filled ? 'currentColor' : 'none'}
      />
      <path d="M9 20v-6h6v6" stroke={props.filled ? 'white' : 'currentColor'} />
    </svg>
  );
}

/** Engranaje — Ajustes. */
export function IconoAjustes(props: Props) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="3" fill={props.filled ? 'currentColor' : 'none'} />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.09a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" />
    </svg>
  );
}

export function IconoCerrar(props: Props) {
  return (
    <svg {...base(props)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function IconoMas(props: Props) {
  return (
    <svg {...base(props)} strokeWidth={2.6}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconoCheck(props: Props) {
  return (
    <svg {...base(props)} strokeWidth={2.6}>
      <path d="m4.5 12.5 5 5L19.5 7" />
    </svg>
  );
}

export function IconoTacho(props: Props) {
  return (
    <svg {...base(props)}>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l1 13h9l1-13M10 11v5M14 11v5" />
    </svg>
  );
}

export function IconoLapiz(props: Props) {
  return (
    <svg {...base(props)}>
      <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17l-1 4ZM14 7l3 3" />
    </svg>
  );
}

export function IconoReloj(props: Props) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

export function IconoCandado(props: Props) {
  return (
    <svg {...base(props)}>
      <rect x="5" y="11" width="14" height="9" rx="2" fill={props.filled ? 'currentColor' : 'none'} />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/** WhatsApp (glifo con relleno). */
export function IconoWhatsApp(props: Props) {
  const { filled: _f, ...rest } = props;
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor" {...rest}>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.6-6.1c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.4-2.9c-.3-.4 0-.5.2-.7l.4-.5c.1-.2.1-.3.2-.5s0-.4 0-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1.1 2.7a11 11 0 0 0 4.3 3.8c.6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2l-.5-.3Z" />
    </svg>
  );
}

export function IconoMail(props: Props) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

export function IconoLink(props: Props) {
  return (
    <svg {...base(props)}>
      <path d="M10 14a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.1M14 10a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1" />
    </svg>
  );
}

export function IconoCopiar(props: Props) {
  return (
    <svg {...base(props)}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </svg>
  );
}

/** Chispa / IA. */
export function IconoChispa(props: Props) {
  const { filled, ...rest } = props;
  return (
    <svg {...base(props)}>
      <path
        d="M12 3l1.8 4.9L18.7 9.7 13.8 11.5 12 16.4 10.2 11.5 5.3 9.7 10.2 7.9 12 3Z"
        fill={filled ? 'currentColor' : 'none'}
        {...(rest as object)}
      />
      <path d="M18.5 15l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7.7-1.9Z" fill="currentColor" />
    </svg>
  );
}

export function IconoEnviar(props: Props) {
  return (
    <svg {...base(props)}>
      <path d="M4.5 12h14M12.5 5.5 19 12l-6.5 6.5" />
    </svg>
  );
}

export function IconoPersona(props: Props) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8" r="4" fill={props.filled ? 'currentColor' : 'none'} />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

export function IconoFlechaIzq(props: Props) {
  return (
    <svg {...base(props)}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

export function IconoFlechaDer(props: Props) {
  return (
    <svg {...base(props)}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

/** Dos personas — Clientes (cartera). */
export function IconoClientes(props: Props) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8.5" r="3.5" fill={props.filled ? 'currentColor' : 'none'} />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 5.6a3.5 3.5 0 0 1 0 5.8M17.8 14.1a6.5 6.5 0 0 1 3.7 5.9" />
    </svg>
  );
}
