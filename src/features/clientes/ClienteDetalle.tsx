import { claveDia, sumarDias, desdeClave, formatFechaLarga } from '../../lib/fecha';
import { formatPesos } from '../../lib/format';
import { linkWhatsApp, linkEmail, mensajeReenganche } from '../../lib/mensajes';
import { Sheet } from '../../components/Sheet';
import { NumeroAnimado } from '../../components/NumeroAnimado';
import { IconoMail, IconoWhatsApp, IconoReloj } from '../../components/Iconos';
import type { Cliente } from '../../lib/clientes';
import { copy } from './clientes.copy';

const c = copy.detalle;

interface Props {
  cliente: Cliente;
  onCerrar: () => void;
  nombreBarberia: string;
}

export function ClienteDetalle({ cliente, onCerrar, nombreBarberia }: Props) {
  const estadoTxt = c.estados[cliente.estado];

  return (
    <Sheet abierto onCerrar={onCerrar} titulo={cliente.nombre}>
      <div className="space-y-4">
        {/* Contacto + estado */}
        <div className="space-y-0.5 text-sm text-carbon-900/55">
          {cliente.telefono && <p className="num">{cliente.telefono}</p>}
          {cliente.email && <p>{cliente.email}</p>}
          {estadoTxt && <p className="pt-1 font-semibold text-carbon-900/75">{estadoTxt}</p>}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="card anim-subir p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-carbon-900/40">
              {c.kpis.visitas}
            </p>
            <p className="num text-xl font-extrabold">{cliente.visitas}</p>
          </div>
          <div className="card anim-subir p-3 text-center" style={{ animationDelay: '60ms' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-carbon-900/40">
              {c.kpis.frecuencia}
            </p>
            <p className="num text-xl font-extrabold">
              {cliente.frecuenciaDias != null ? (
                <>
                  {cliente.frecuenciaDias}
                  <span className="text-xs font-semibold text-carbon-900/40"> {c.kpis.dias}</span>
                </>
              ) : (
                '—'
              )}
            </p>
          </div>
          <div className="card anim-subir p-3 text-center" style={{ animationDelay: '120ms' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-carbon-900/40">
              {c.kpis.gastado}
            </p>
            <p className="text-xl font-extrabold">
              <NumeroAnimado valor={cliente.gastado} />
            </p>
          </div>
        </div>

        {/* Heatmap de visitas */}
        <div className="card anim-subir p-4" style={{ animationDelay: '160ms' }}>
          <h3 className="mb-3 text-sm font-bold">{c.heatmap}</h3>
          <HeatmapVisitas dias={cliente.dias} />
        </div>

        {/* Próximo turno */}
        {cliente.proximoTurno && (
          <div className="card flex items-center gap-3 border-l-4 border-l-confirmado p-4">
            <IconoReloj width={22} height={22} className="shrink-0 text-confirmado" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{c.proximo}</p>
              <p className="truncate text-sm text-carbon-900/60">
                {formatFechaLarga(cliente.proximoTurno.dia)} ·{' '}
                <span className="num font-semibold">{cliente.proximoTurno.hora} hs</span> ·{' '}
                {cliente.proximoTurno.servicioNombre}
              </p>
            </div>
          </div>
        )}

        {/* Acciones */}
        {cliente.telefono && (
          <div className="grid grid-cols-2 gap-2">
            <a
              href={linkWhatsApp(cliente.telefono, `¡Hola ${cliente.nombre.split(' ')[0]}!`)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-3 py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
            >
              <IconoWhatsApp width={19} height={19} />
              {c.whatsapp}
            </a>
            <a
              href={linkWhatsApp(cliente.telefono, mensajeReenganche(cliente.nombre.split(' ')[0], nombreBarberia))}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[#25D366]/40 px-3 py-3 text-sm font-semibold text-[#128C7E] transition active:scale-[0.98]"
            >
              💈 {c.reenganche}
            </a>
          </div>
        )}
        {cliente.email && (
          <a
            href={linkEmail(cliente.email, `${nombreBarberia}`, mensajeReenganche(cliente.nombre.split(' ')[0], nombreBarberia))}
            className="btn-secundario py-3 text-sm"
          >
            <IconoMail width={18} height={18} />
            {c.email}
          </a>
        )}

        {/* Historial */}
        {cliente.historial.length > 0 && (
          <div className="card p-4">
            <h3 className="mb-2 text-sm font-bold">{c.historial}</h3>
            <ul className="divide-y divide-carbon/5">
              {cliente.historial.slice(0, 8).map((v, i) => (
                <li key={v.dia + i} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-carbon-900/70">{formatFechaLarga(v.dia)}</span>
                  <span className="min-w-0 flex-1 truncate px-3 text-right text-carbon-900/50">
                    {v.servicioNombre}
                  </span>
                  <b className="num shrink-0">{formatPesos(v.precio)}</b>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Sheet>
  );
}

/** Heatmap estilo GitHub: 16 semanas × 7 días, oro donde hubo visita. */
function HeatmapVisitas({ dias }: { dias: string[] }) {
  const hoy = claveDia();
  const dow = (desdeClave(hoy).getDay() + 6) % 7; // días desde el lunes
  const lunesActual = sumarDias(hoy, -dow);
  const inicio = sumarDias(lunesActual, -15 * 7);
  const set = new Set(dias);

  const semanas = Array.from({ length: 16 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => sumarDias(inicio, w * 7 + d)),
  );

  return (
    <div className="flex justify-between gap-[3px]">
      {semanas.map((sem, i) => (
        <div key={i} className="flex flex-1 flex-col gap-[3px]">
          {sem.map((dia) => (
            <span
              key={dia}
              title={dia}
              className={`aspect-square w-full rounded-[3px] ${
                dia > hoy ? 'bg-transparent' : set.has(dia) ? 'bg-oro' : 'bg-carbon-100'
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
