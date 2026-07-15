import { useState } from 'react';
import { cambiarEstadoTurno, marcarTurnoHecho, borrarTurno } from '../../db/turnos';
import {
  linkWhatsApp,
  linkEmail,
  mensajeConfirmacion,
  mensajeRecordatorio,
  asuntoEmail,
} from '../../lib/mensajes';
import { formatFechaLarga } from '../../lib/fecha';
import { formatPesos } from '../../lib/format';
import { Sheet } from '../../components/Sheet';
import {
  IconoCheck,
  IconoLapiz,
  IconoMail,
  IconoTacho,
  IconoWhatsApp,
} from '../../components/Iconos';
import type { MedioPago, Turno } from '../../db/types';
import { copy } from './agenda.copy';

interface Props {
  turno: Turno | null;
  onCerrar: () => void;
  onEditar: (turno: Turno) => void;
  nombreBarberia: string;
}

const c = copy.detalle;

const COLORES_ESTADO: Record<string, string> = {
  pendiente: 'bg-pendiente/15 text-pendiente',
  confirmado: 'bg-confirmado/15 text-confirmado',
  hecho: 'bg-ok/15 text-ok',
  cancelado: 'bg-cancelado/20 text-carbon-900/50',
};

export function TurnoDetalle({ turno, onCerrar, onEditar, nombreBarberia }: Props) {
  const [eligiendoPago, setEligiendoPago] = useState(false);

  if (!turno) return null;
  // Alias const: mantiene el narrowing dentro de los closures del JSX.
  const t = turno;

  async function hecho(medioPago: MedioPago) {
    await marcarTurnoHecho(t, medioPago);
    setEligiendoPago(false);
    onCerrar();
  }

  async function cancelar() {
    await cambiarEstadoTurno(t.uuid, 'cancelado');
    onCerrar();
  }

  async function borrar() {
    if (!window.confirm(c.confirmarBorrar)) return;
    await borrarTurno(t.uuid);
    onCerrar();
  }

  const activo = t.estado === 'pendiente' || t.estado === 'confirmado';

  return (
    <Sheet abierto onCerrar={onCerrar} titulo={c.titulo}>
      <div className="space-y-4">
        {/* Datos del turno */}
        <div className="card space-y-1 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-lg font-bold">{t.clienteNombre}</p>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${COLORES_ESTADO[t.estado]}`}
            >
              {copy.estados[t.estado]}
            </span>
          </div>
          <p className="text-carbon-900/70">
            {formatFechaLarga(t.dia)} · <span className="num font-semibold">{t.hora} hs</span>
          </p>
          <p className="text-carbon-900/70">
            {t.servicioNombre} · {formatPesos(t.precio)} · {t.duracionMin} min
          </p>
          {t.clienteTelefono && <p className="num text-sm text-carbon-900/50">{t.clienteTelefono}</p>}
          {t.clienteEmail && <p className="text-sm text-carbon-900/50">{t.clienteEmail}</p>}
          {t.nota && <p className="text-sm italic text-carbon-900/50">“{t.nota}”</p>}
          {t.origen === 'cliente' && (
            <p className="text-xs font-semibold text-oro-dark">🔗 {copy.origenCliente}</p>
          )}
        </div>

        {/* Avisos al cliente */}
        {t.clienteTelefono && activo && (
          <div className="grid grid-cols-2 gap-2">
            <a
              href={linkWhatsApp(t.clienteTelefono, mensajeConfirmacion(t, nombreBarberia))}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-3 py-3.5 text-sm font-semibold text-white transition active:scale-[0.98]"
            >
              <IconoWhatsApp width={20} height={20} />
              {c.whatsapp}
            </a>
            <a
              href={linkWhatsApp(t.clienteTelefono, mensajeRecordatorio(t, nombreBarberia))}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[#25D366]/40 px-3 py-3.5 text-sm font-semibold text-[#128C7E] transition active:scale-[0.98]"
            >
              <IconoWhatsApp width={20} height={20} />
              {c.recordatorio}
            </a>
          </div>
        )}
        {t.clienteEmail && activo && (
          <a
            href={linkEmail(
              t.clienteEmail,
              asuntoEmail(t, nombreBarberia),
              mensajeConfirmacion(t, nombreBarberia),
            )}
            className="btn-secundario py-3 text-base"
          >
            <IconoMail width={20} height={20} />
            {c.email}
          </a>
        )}

        {/* Acciones sobre el turno */}
        {t.estado === 'pendiente' && (
          <button
            type="button"
            className="btn-secundario py-3 text-base"
            onClick={() => cambiarEstadoTurno(t.uuid, 'confirmado')}
          >
            <IconoCheck width={20} height={20} />
            {c.confirmar}
          </button>
        )}

        {activo && !eligiendoPago && (
          <button type="button" className="btn-primario" onClick={() => setEligiendoPago(true)}>
            <IconoCheck width={22} height={22} />
            {c.hecho}
          </button>
        )}
        {eligiendoPago && (
          <div className="card p-4">
            <p className="mb-3 text-center font-semibold">{c.hechoPregunta}</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn-primario py-3 text-base" onClick={() => hecho('efectivo')}>
                {c.efectivo}
              </button>
              <button
                type="button"
                className="btn-primario py-3 text-base"
                onClick={() => hecho('transferencia')}
              >
                {c.transferencia}
              </button>
            </div>
          </div>
        )}
        {t.estado === 'hecho' && <p className="text-center text-sm text-ok">{c.yaFichado}</p>}

        <div className="flex gap-2">
          {activo && (
            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-2 py-2 font-semibold text-carbon-900/60"
              onClick={() => onEditar(t)}
            >
              <IconoLapiz width={18} height={18} />
              {c.editar}
            </button>
          )}
          {activo && (
            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-2 py-2 font-semibold text-pendiente"
              onClick={cancelar}
            >
              {c.cancelar}
            </button>
          )}
          {!activo && (
            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-2 py-2 font-semibold text-rojo"
              onClick={borrar}
            >
              <IconoTacho width={18} height={18} />
              {c.borrar}
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
